/* extension.js
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

import GObject from "gi://GObject";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import Clutter from "gi://Clutter";
import St from "gi://St";

import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import {Extension} from "resource:///org/gnome/shell/extensions/extension.js";

const refreshInterval = 5;

const Indicator = GObject.registerClass(
  class Indicator extends PanelMenu.Button {
    _init() {
      // `menuAlignment`, `nameText`, `dontCreateMenu`.
      super._init(0.0, "Latency", true);

      this._label = new St.Label({
        "y_align": Clutter.ActorAlign.CENTER,
        "text": ""
      });

      this.add_child(this._label);
    }

    setText(text) {
      return this._label.set_text(text);
    }
});

export default class Latency extends Extension {
    constructor(metadata) {
        super(metadata);

        this._metadata = metadata;
        this._uuid = metadata.uuid;
        this._settings = null;
    }

    enable() {
    this._textDecoder = new TextDecoder();
    this._timeout = null;
    this._settings = this.getSettings();

    this._indicator = new Indicator();
    // `role`, `indicator`, `position`, `box`.
    // `-1` is not OK for position, it will show at the right of system menu.
    Main.panel.addToStatusArea(this._uuid, this._indicator, 1, "left");

    this._timeout = GLib.timeout_add_seconds(
        GLib.PRIORITY_DEFAULT, refreshInterval, () => {
            this.getCurrentLatency(refreshInterval);
            return GLib.SOURCE_CONTINUE;
        }
    );
    }

    disable() {
    if (this._indicator != null) {
        this._indicator.destroy();
        this._indicator = null;
    }
    this._textDecoder = null;
    this._lastSum = null;
    this._settings = null;
    if (this._timeout != null) {
        GLib.source_remove(this._timeout);
        this._timeout = null;
    }
    }

    getCurrentLatency(refreshInterval) {
        const scriptArgs = [`${this.path}/show-ping-time.sh`];

        const ipWanAddress = this._settings.get_string('latency-ip-wan').trim();;
        if (ipWanAddress.length > 0) {
            scriptArgs.push("--ip", ipWanAddress);
        }
        
        const resolveDomain = this._settings.get_string('latency-resolve-domain').trim();;
        if (resolveDomain.length > 0) {
            scriptArgs.push("--domain", resolveDomain);
        }

        try {
            const proc = Gio.Subprocess.new(
                scriptArgs,
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );

            proc.communicate_utf8_async(null, null, (proc, result) => {
                try {
                    const [status, stdout, stderr] = proc.communicate_utf8_finish(result);
                    if (status) {
                        let displayText = String(stdout).trim();

                        // Check if user wants to show the "Latency" label
                        if (this._settings.get_boolean('show-latency-label')) {
                            // Add "Latency: " prefix if it's a latency value (ends with "ms")
                            if (displayText.endsWith('ms') && !displayText.startsWith('[')) {
                                displayText = 'Latency: ' + displayText;
                            }
                        }

                        this._indicator.setText(displayText);
                    } else {
                        log(`Error ejecutando el script: ${String(stderr).trim()}`);
                        this._indicator.setText("Error");
                    }
                } catch (e) {
                    logError(e);
                    this._indicator.setText("Error");
                }
            });
        } catch (e) {
            logError(e);
            this._indicator.setText("Error");
        }
    }
};
