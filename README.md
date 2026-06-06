# Dell Fan Control — GNOME Shell Extension

Control manual del ventilador para laptops Dell compatibles, desde los Quick Settings de GNOME Shell.

## Requisitos

- GNOME Shell 45–50
- Kernel con `dell_smm` hwmon (driver del ventilador)
- Firmware con `dell-wmi-sysman` (atributo `ThermalManagement`)
- `pkexec` disponible (Polkit)

## Compatibilidad

Funciona en laptops Dell que expongan:
- `/sys/class/hwmon/hwmon*/name` = `dell_smm`
- `/sys/class/firmware-attributes/dell-wmi-sysman/attributes/ThermalManagement/`

Probado en líneas **Latitude**, **Precision** y **XPS** con BIOS que soporte Thermal Management.

## Instalación

```bash
# 1. Instalar el script helper
sudo cp dell-fan-helper.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/dell-fan-helper.sh

# 2. Permitir pkexec sin contraseña (opcional pero recomendado)
echo 'Action=com.ubuntu.pkexec.dell-fan-helper.sh' | sudo tee /usr/share/polkit-1/actions/dell-fan-helper.policy

# 3. Copiar la extensión
cp -r dell-fan-control@local ~/.local/share/gnome-shell/extensions/

# 4. Activar la extensión
gnome-extensions enable dell-fan-control@local
```

Cierra sesión y vuelve a entrar (Wayland) o reinicia GNOME Shell con Alt+F2 + `r` (X11).

## Modos disponibles

| Modo              | Descripción                        |
|-------------------|------------------------------------|
| Optimized         | Balance entre ruido y temperatura  |
| Cool              | Máxima refrigeración               |
| Quiet             | Mínimo ruido de ventilador         |
| UltraPerformance  | Máximo rendimiento                 |
