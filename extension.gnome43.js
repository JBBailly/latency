/* extension.js - GNOME 43/44 compatible (legacy imports API)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

const {GObject, GLib, Gio, Clutter, St} = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;

const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {
        _init(openPrefsCallback) {
            // `menuAlignment`, `nameText`, `dontCreateMenu`.
            super._init(0.0, 'Latency', false);

            this._label = new St.Label({
                y_align: Clutter.ActorAlign.CENTER,
                text: ''
            });
            this.add_child(this._label);

            const prefsItem = new PopupMenu.PopupMenuItem('Preferences');
            prefsItem.connect('activate', openPrefsCallback);
            this.menu.addMenuItem(prefsItem);
        }

        setText(text) {
            this._label.set_text(text);
        }

        setColor(hexColor) {
            this._label.style = hexColor ? `color: ${hexColor};` : '';
        }
    }
);

class Latency {
    constructor() {
        this._indicator = null;
        this._timeout = null;
        this._settings = null;
        this._extensionPath = null;
        this._uuid = null;
        this._positionChangedId = null;
        this._intervalChangedId = null;
    }

    enable() {
        const extension = ExtensionUtils.getCurrentExtension();
        this._extensionPath = extension.path;
        this._uuid = extension.uuid;
        this._settings = ExtensionUtils.getSettings();

        this._positionChangedId = this._settings.connect(
            'changed::latency-position', () => this._createIndicator()
        );
        this._intervalChangedId = this._settings.connect(
            'changed::latency-refresh-interval', () => this._restartTimer()
        );

        this._createIndicator();
        this._restartTimer();
    }

    disable() {
        if (this._positionChangedId) {
            this._settings.disconnect(this._positionChangedId);
            this._positionChangedId = null;
        }
        if (this._intervalChangedId) {
            this._settings.disconnect(this._intervalChangedId);
            this._intervalChangedId = null;
        }
        if (this._timeout != null) {
            GLib.source_remove(this._timeout);
            this._timeout = null;
        }
        if (this._indicator != null) {
            this._indicator.destroy();
            this._indicator = null;
        }
        this._settings = null;
    }

    _restartTimer() {
        if (this._timeout != null) {
            GLib.source_remove(this._timeout);
            this._timeout = null;
        }
        const interval = this._settings.get_int('latency-refresh-interval');
        this.getCurrentLatency();
        this._timeout = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT, interval, () => {
                this.getCurrentLatency();
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    _createIndicator() {
        if (this._indicator != null) {
            this._indicator.destroy();
        }

        const position = this._settings.get_string('latency-position');
        const box = position === 'right' ? 'right' : 'left';
        const pos = position === 'right' ? 0 : 1;

        this._indicator = new Indicator(() => ExtensionUtils.openPrefs());
        Main.panel.addToStatusArea(this._uuid, this._indicator, pos, box);
    }

    getCurrentLatency() {
        const scriptArgs = [`${this._extensionPath}/show-ping-time.sh`];

        const ipWanAddress = this._settings.get_string('latency-ip-wan').trim();
        if (ipWanAddress.length > 0)
            scriptArgs.push('--ip', ipWanAddress);

        const resolveDomain = this._settings.get_string('latency-resolve-domain').trim();
        if (resolveDomain.length > 0)
            scriptArgs.push('--domain', resolveDomain);

        try {
            const proc = Gio.Subprocess.new(
                scriptArgs,
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );

            proc.communicate_utf8_async(null, null, (proc, result) => {
                try {
                    const [ok, stdout, stderr] = proc.communicate_utf8_finish(result);
                    if (ok) {
                        let rawText = String(stdout).trim();
                        let displayText = rawText;

                        if (rawText.endsWith('ms') && !rawText.startsWith('[')) {
                            // Numeric latency value — apply color and optional label
                            const latencyMs = parseFloat(rawText);
                            const warnThreshold = this._settings.get_int('latency-threshold-warning');
                            const critThreshold = this._settings.get_int('latency-threshold-critical');

                            if (latencyMs >= critThreshold)
                                this._indicator.setColor(this._settings.get_string('latency-color-critical'));
                            else if (latencyMs >= warnThreshold)
                                this._indicator.setColor(this._settings.get_string('latency-color-warning'));
                            else
                                this._indicator.setColor(this._settings.get_string('latency-color-ok'));

                            if (this._settings.get_boolean('show-latency-label'))
                                displayText = 'Latency: ' + rawText;
                        } else {
                            // Error state (no connection, DNS problem) — no color
                            this._indicator.setColor('');
                        }

                        this._indicator.setText(displayText);
                    } else {
                        log(`Error running script: ${String(stderr).trim()}`);
                        this._indicator.setColor('');
                        this._indicator.setText('Error');
                    }
                } catch (e) {
                    logError(e);
                    this._indicator.setColor('');
                    this._indicator.setText('Error');
                }
            });
        } catch (e) {
            logError(e);
            this._indicator.setColor('');
            this._indicator.setText('Error');
        }
    }
}

function init() {
    return new Latency();
}
