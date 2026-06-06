import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { QuickMenuToggle, SystemIndicator } from 'resource:///org/gnome/shell/ui/quickSettings.js';

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

const HELPER = '/usr/local/bin/dell-fan-helper.sh';
const MODES = ['Quiet', 'Optimized', 'Cool', 'UltraPerformance'];

const MODE_ICONS = {
    'Quiet':           'audio-volume-muted-symbolic',
    'Optimized':       'emblem-default-symbolic',
    'Cool':            'weather-windy-symbolic',
    'UltraPerformance':'power-profile-performance-symbolic',
};

function _spawnHelper(argv) {
    return new Promise((resolve) => {
        try {
            let proc = Gio.Subprocess.new(
                ['pkexec', HELPER, ...argv],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );
            proc.communicate_utf8_async(null, null, (p, res) => {
                try {
                    let [, stdout] = p.communicate_utf8_finish(res);
                    resolve(stdout);
                } catch (e) {
                    resolve('');
                }
            });
        } catch (e) {
            log('[dell-fan-control] spawn error: ' + e);
            resolve('');
        }
    });
}

function _parseState(stdout) {
    try {
        return JSON.parse(stdout.trim());
    } catch (e) {
        return { fan_rpm: 0, thermal_mode: 'unknown', temp: 0 };
    }
}

const FanQuickToggle = GObject.registerClass(
class FanQuickToggle extends QuickMenuToggle {
    _init(gicon) {
        super._init({
            title: 'Fan Control',
            gicon: gicon,
            toggleMode: false,
        });

        this._gicon = gicon;
        this._state = { fan_rpm: 0, thermal_mode: 'unknown', temp: 0 };
        this._pollId = 0;
        this._modeItems = new Map();

        this.menu.setHeader(gicon, 'Fan Control', 'Loading…');

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        for (let mode of MODES) {
            const iconName = MODE_ICONS[mode] ?? 'applications-system-symbolic';
            const item = new PopupMenu.PopupImageMenuItem(mode, iconName);
            item.connect('activate', () => this._setMode(mode));
            this.menu.addMenuItem(item);
            this._modeItems.set(mode, item);
        }

        this.connect('destroy', () => this._onDestroy());
        this._startPoll();
    }

    _setMode(modeName) {
        this._state.thermal_mode = modeName;
        this._updateUI();
        _spawnHelper(['set-mode', modeName]).then(() => this._poll());
    }

    _startPoll() {
        this._poll();
        this._pollId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 3, () => {
            this._poll();
            return GLib.SOURCE_CONTINUE;
        });
    }

    async _poll() {
        let stdout = await _spawnHelper(['status']);
        this._state = _parseState(stdout);
        this._updateUI();
    }

    _updateUI() {
        let mode = this._state.thermal_mode || 'unknown';

        this.subtitle = mode;
        this.checked = MODES.includes(mode) && mode !== 'Optimized';

        this.menu.setHeader(this._gicon, 'Fan Control', mode);

        for (let [m, item] of this._modeItems) {
            item.setOrnament(m === mode ? PopupMenu.Ornament.CHECK : PopupMenu.Ornament.NONE);
        }
    }

    _onDestroy() {
        if (this._pollId) {
            GLib.source_remove(this._pollId);
            this._pollId = 0;
        }
    }
});

const FanIndicator = GObject.registerClass(
class FanIndicator extends SystemIndicator {
    _init(gicon) {
        super._init();

        this._toggle = new FanQuickToggle(gicon);
        this.quickSettingsItems.push(this._toggle);
    }
});

export default class FanControlExtension extends Extension {
    enable() {
        const gicon = Gio.icon_new_for_string(this.path + '/icons/fan-symbolic.svg');
        this._indicator = new FanIndicator(gicon);
        Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);
    }

    disable() {
        this._indicator?.quickSettingsItems.forEach(item => item.destroy());
        this._indicator?.destroy();
        this._indicator = null;
    }
}