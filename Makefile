# Makefile for GNOME Shell Latency Extension

# Extension metadata
EXTENSION_UUID = latency@mboscovich.github.io
EXTENSION_NAME = latency

# Directories
SCHEMAS_DIR = schemas
INSTALL_DIR = $(HOME)/.local/share/gnome-shell/extensions/$(EXTENSION_UUID)
DIST_DIR    = dist

# Common files shared across all versions
COMMON_FILES = show-ping-time.sh LICENSE README.md
SCHEMA_FILES = $(SCHEMAS_DIR)/org.gnome.shell.extensions.latency.gschema.xml
COMPILED_SCHEMA = $(SCHEMAS_DIR)/gschemas.compiled

.PHONY: help build install uninstall clean check-deps check zip-gnome43 zip-gnome45 zip-all

# Default target
all: build

help:
	@echo "Available targets:"
	@echo "  build        - Compile schemas and prepare the extension"
	@echo "  install      - Install for the current GNOME version"
	@echo "  uninstall    - Remove the extension"
	@echo "  zip-gnome43  - Build ZIP for GNOME 43/44 (extensions.gnome.org)"
	@echo "  zip-gnome45  - Build ZIP for GNOME 45+  (extensions.gnome.org)"
	@echo "  zip-all      - Build both ZIPs"
	@echo "  clean        - Clean build artifacts"
	@echo "  check-deps   - Check required dependencies"
	@echo "  check        - Check extension structure"
	@echo "  help         - Show this help message"

build: $(COMPILED_SCHEMA)
	@echo "Building extension..."
	@chmod +x show-ping-time.sh
	@echo "Extension built successfully!"

$(COMPILED_SCHEMA): $(SCHEMA_FILES)
	@echo "Compiling GSettings schemas..."
	@glib-compile-schemas $(SCHEMAS_DIR)/
	@echo "Schemas compiled successfully!"

# ─── Local install (auto-detects GNOME version) ──────────────────────────────

install: build
	@echo "Installing extension to $(INSTALL_DIR)..."
	@mkdir -p $(INSTALL_DIR)/$(SCHEMAS_DIR)
	@GNOME_VER=$$(gnome-shell --version 2>/dev/null | grep -oP '\d+' | head -1); \
	if [ -n "$$GNOME_VER" ] && [ "$$GNOME_VER" -lt 45 ]; then \
		echo "Detected GNOME $$GNOME_VER: installing GNOME 43/44 compatible files..."; \
		cp extension.gnome43.js $(INSTALL_DIR)/extension.js; \
		cp prefs.gnome43.js $(INSTALL_DIR)/prefs.js; \
	else \
		echo "Detected GNOME $$GNOME_VER: installing GNOME 45+ compatible files..."; \
		cp extension.js $(INSTALL_DIR)/extension.js; \
		cp prefs.js $(INSTALL_DIR)/prefs.js; \
	fi
	@cp metadata.json $(INSTALL_DIR)/
	@cp $(COMMON_FILES) $(INSTALL_DIR)/
	@cp $(SCHEMA_FILES) $(INSTALL_DIR)/$(SCHEMAS_DIR)/
	@cp $(COMPILED_SCHEMA) $(INSTALL_DIR)/$(SCHEMAS_DIR)/
	@echo "Extension installed successfully!"
	@echo ""
	@echo "To enable the extension:"
	@echo "1. Restart GNOME Shell (Alt+F2, type 'r', press Enter on X11)"
	@echo "2. Enable the extension: gnome-extensions enable $(EXTENSION_UUID)"

uninstall:
	@echo "Uninstalling extension..."
	@if [ -d "$(INSTALL_DIR)" ]; then \
		rm -rf "$(INSTALL_DIR)"; \
		echo "Extension uninstalled successfully!"; \
	else \
		echo "Extension not found in $(INSTALL_DIR)"; \
	fi

# ─── Distribution ZIPs for extensions.gnome.org ─────────────────────────────

zip-gnome43: build
	@echo "Building GNOME 43/44 ZIP..."
	@rm -rf $(DIST_DIR)/gnome43 && mkdir -p $(DIST_DIR)/gnome43/$(SCHEMAS_DIR)
	@cp extension.gnome43.js  $(DIST_DIR)/gnome43/extension.js
	@cp prefs.gnome43.js      $(DIST_DIR)/gnome43/prefs.js
	@cp $(COMMON_FILES)       $(DIST_DIR)/gnome43/
	@cp $(SCHEMA_FILES)       $(DIST_DIR)/gnome43/$(SCHEMAS_DIR)/
	@cp $(COMPILED_SCHEMA)    $(DIST_DIR)/gnome43/$(SCHEMAS_DIR)/
	@python3 -c "import json; m=json.load(open('metadata.json')); m['shell-version']=['43','44']; json.dump(m, open('$(DIST_DIR)/gnome43/metadata.json','w'), indent=2); print('')"
	@cd $(DIST_DIR)/gnome43 && zip -r ../../latency-gnome43.zip . -x "*.DS_Store"
	@rm -rf $(DIST_DIR)/gnome43
	@echo "Created latency-gnome43.zip"

zip-gnome45: build
	@echo "Building GNOME 45+ ZIP..."
	@rm -rf $(DIST_DIR)/gnome45 && mkdir -p $(DIST_DIR)/gnome45/$(SCHEMAS_DIR)
	@cp extension.js          $(DIST_DIR)/gnome45/extension.js
	@cp prefs.js              $(DIST_DIR)/gnome45/prefs.js
	@cp $(COMMON_FILES)       $(DIST_DIR)/gnome45/
	@cp $(SCHEMA_FILES)       $(DIST_DIR)/gnome45/$(SCHEMAS_DIR)/
	@cp $(COMPILED_SCHEMA)    $(DIST_DIR)/gnome45/$(SCHEMAS_DIR)/
	@python3 -c "import json; m=json.load(open('metadata.json')); m['shell-version']=['45','46','47','48','49','50']; json.dump(m, open('$(DIST_DIR)/gnome45/metadata.json','w'), indent=2); print('')"
	@cd $(DIST_DIR)/gnome45 && zip -r ../../latency-gnome45.zip . -x "*.DS_Store"
	@rm -rf $(DIST_DIR)/gnome45
	@echo "Created latency-gnome45.zip"

zip-all: zip-gnome43 zip-gnome45
	@echo ""
	@echo "Both ZIPs ready for extensions.gnome.org:"
	@echo "  latency-gnome43.zip  ->  upload for GNOME 43 and 44"
	@echo "  latency-gnome45.zip  ->  upload for GNOME 45, 46, 47, 48, 49, 50"

# ─── Utilities ───────────────────────────────────────────────────────────────

clean:
	@echo "Cleaning build artifacts..."
	@rm -f $(COMPILED_SCHEMA)
	@rm -rf $(DIST_DIR)
	@rm -f latency-gnome43.zip latency-gnome45.zip
	@echo "Clean completed!"

check-deps:
	@echo "Checking dependencies..."
	@command -v glib-compile-schemas >/dev/null 2>&1 || { echo "Error: glib-compile-schemas not found. Install: sudo apt install libglib2.0-dev"; exit 1; }
	@command -v ping >/dev/null 2>&1 || { echo "Error: ping not found. Install: sudo apt install iputils-ping"; exit 1; }
	@command -v host >/dev/null 2>&1 || { echo "Error: host not found. Install: sudo apt install bind9-host"; exit 1; }
	@command -v python3 >/dev/null 2>&1 || { echo "Error: python3 not found."; exit 1; }
	@echo "All dependencies are available!"

check:
	@echo "Checking extension structure..."
	@for file in extension.js prefs.js extension.gnome43.js prefs.gnome43.js metadata.json $(COMMON_FILES); do \
		if [ ! -f "$$file" ]; then \
			echo "Warning: $$file not found"; \
		fi; \
	done
	@for file in $(SCHEMA_FILES); do \
		if [ ! -f "$$file" ]; then \
			echo "Error: $$file not found"; \
			exit 1; \
		fi; \
	done
	@echo "Extension structure check completed!"
