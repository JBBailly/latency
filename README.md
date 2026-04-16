# Latency - GNOME Shell Extension

A GNOME Shell extension that displays internet latency (ping) in the top panel. It also shows when the internet connection is lost or if there is a DNS problem.

## Features

- Real-time latency display in the top panel
- Configurable "Latency:" label (can be hidden to show only the ping value)
- Automatic detection of connection issues
- DNS problem detection
- Uses Google's DNS (8.8.8.8) for reliable testing

## Prerequisites

Before building and installing this extension, make sure you have the following installed:

- GNOME Shell (version 48, 49, or 50)
- `glib-compile-schemas` (usually part of `glib2-devel` or `libglib2.0-dev` package)
- `make` (for using the Makefile)
- `ping` command
- `host` command (for DNS checking)

### Installing prerequisites on different distributions:

**Ubuntu/Debian:**
```bash
sudo apt install glib2.0-dev make iputils-ping bind9-host
```

**Fedora/RHEL:**
```bash
sudo dnf install glib2-devel make iputils bind-utils
```

**Arch Linux:**
```bash
sudo pacman -S glib2 make iputils bind
```

## Building

### Using Make (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/mboscovich/latency.git
cd latency
```

2. Build the extension:
```bash
make build
```

3. Install the extension:
```bash
make install
```

### Manual Build

If you prefer to build manually:

1. Clone the repository:
```bash
git clone https://github.com/mboscovich/latency.git
cd latency
```

2. Compile the GSettings schema:
```bash
glib-compile-schemas schemas/
```

3. Make the ping script executable:
```bash
chmod +x show-ping-time.sh
```

4. Copy the extension to your local extensions directory:
```bash
mkdir -p ~/.local/share/gnome-shell/extensions/latency@mboscovich.github.io/
cp -r * ~/.local/share/gnome-shell/extensions/latency@mboscovich.github.io/
```

## Installation

After building, you need to:

1. **Restart GNOME Shell:**
   - On X11: Press `Alt + F2`, type `r`, and press Enter
   - On Wayland: Log out and log back in

2. **Enable the extension:**
   - Using GNOME Extensions app
   - Or via command line: `gnome-extensions enable latency@mboscovich.github.io`

## Configuration

The extension includes a preferences window where you can:

- **Show/Hide "Latency" Label**: Toggle whether to display the word "Latency:" before the ping value

To access preferences:
- Open GNOME Extensions app and click the settings icon for the Latency extension
- Or run: `gnome-extensions prefs latency@mboscovich.github.io`

## Usage

Once installed and enabled, the extension will:

1. Display the current latency in the top panel (updates every 5 seconds)
2. Show `[ No internet connection ]` when offline
3. Show `[ DNS Problem ]` when there are DNS resolution issues
4. Display the ping time in milliseconds (e.g., "29.4ms" or "Latency: 29.4ms")

## Development

### Makefile Targets

- `make build` - Compile schemas and prepare the extension
- `make install` - Install the extension to the user directory
- `make uninstall` - Remove the extension from the user directory
- `make clean` - Clean build artifacts
- `make help` - Show available targets

## Troubleshooting

### Schema compilation error
If you get a schema-related error, make sure to compile the schemas:
```bash
glib-compile-schemas schemas/
```

### Permission denied on ping script
Make sure the ping script is executable:
```bash
chmod +x show-ping-time.sh
```

### Extension not appearing
1. Make sure GNOME Shell has been restarted
2. Check if the extension is enabled: `gnome-extensions list --enabled`
3. Check for errors: `journalctl -f -o cat /usr/bin/gnome-shell`

## License

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 2 of the License, or (at your option) any later version.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
