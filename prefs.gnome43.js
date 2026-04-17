/* prefs.js - GNOME 43/44 compatible (legacy imports API)
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

const {Adw, Gtk, Gdk, Gio} = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;

const DEFAULT_WAN_IP         = '8.8.8.8';
const DEFAULT_RESOLVE_DOMAIN = 'google.com';
const POSITION_VALUES        = ['left', 'right'];

// Convert Gdk.RGBA to hex string (#rrggbb)
function _rgbaToHex(rgba) {
    const r = Math.round(rgba.red   * 255).toString(16).padStart(2, '0');
    const g = Math.round(rgba.green * 255).toString(16).padStart(2, '0');
    const b = Math.round(rgba.blue  * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
}

// Build an ActionRow with a ColorButton suffix bound to a GSettings string key
function _makeColorRow(title, subtitle, settingKey, settings) {
    const row = new Adw.ActionRow({title, subtitle});

    const button = new Gtk.ColorButton({
        valign: Gtk.Align.CENTER,
        use_alpha: false,
    });

    const rgba = new Gdk.RGBA();
    rgba.parse(settings.get_string(settingKey));
    button.set_rgba(rgba);

    button.connect('color-set', () => {
        settings.set_string(settingKey, _rgbaToHex(button.get_rgba()));
    });
    settings.connect(`changed::${settingKey}`, () => {
        const updated = new Gdk.RGBA();
        updated.parse(settings.get_string(settingKey));
        button.set_rgba(updated);
    });

    row.add_suffix(button);
    return row;
}

function init() {}

function fillPreferencesWindow(window) {
    const settings = ExtensionUtils.getSettings();

    const page = new Adw.PreferencesPage({
        title: 'General',
        icon_name: 'dialog-information-symbolic',
    });
    window.add(page);

    // ── Display group ───────────────────────────────────────────────────────
    const displayGroup = new Adw.PreferencesGroup({title: 'Display'});
    page.add(displayGroup);

    // Adw.SwitchRow requires libadwaita 1.4 (GNOME 45+).
    // Use Adw.ActionRow + Gtk.Switch for GNOME 43/44 compatibility.
    const latencyLabelRow = new Adw.ActionRow({
        title: 'Show "Latency" Label',
        subtitle: 'Display the word "Latency:" before the ping value',
    });
    const latencyLabelSwitch = new Gtk.Switch({valign: Gtk.Align.CENTER});
    latencyLabelRow.add_suffix(latencyLabelSwitch);
    latencyLabelRow.activatable_widget = latencyLabelSwitch;
    displayGroup.add(latencyLabelRow);
    settings.bind('show-latency-label', latencyLabelSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);

    // Position combo row (Adw.ComboRow available since libadwaita 1.0)
    // Note: Gtk.StringList({strings:[...]}) constructor not available in GTK 4.8 (GNOME 43).
    const positionModel = new Gtk.StringList();
    positionModel.append('Left');
    positionModel.append('Right');
    const positionRow = new Adw.ComboRow({
        title: 'Panel Position',
        subtitle: 'Where to show the indicator in the panel',
        model: positionModel,
    });
    positionRow.selected = Math.max(0, POSITION_VALUES.indexOf(
        settings.get_string('latency-position')
    ));
    positionRow.connect('notify::selected', () => {
        settings.set_string('latency-position', POSITION_VALUES[positionRow.selected]);
    });
    settings.connect('changed::latency-position', () => {
        positionRow.selected = Math.max(0, POSITION_VALUES.indexOf(
            settings.get_string('latency-position')
        ));
    });
    displayGroup.add(positionRow);

    // ── Connection group ────────────────────────────────────────────────────
    const connectionGroup = new Adw.PreferencesGroup({title: 'Connection'});
    page.add(connectionGroup);

    const ipWan = new Adw.EntryRow({
        title: 'IP WAN Address',
        text: settings.get_string('latency-ip-wan') || DEFAULT_WAN_IP,
    });
    connectionGroup.add(ipWan);
    settings.bind('latency-ip-wan', ipWan, 'text', Gio.SettingsBindFlags.DEFAULT);

    const resolveDomain = new Adw.EntryRow({
        title: 'Resolve Domain',
        text: settings.get_string('latency-resolve-domain') || DEFAULT_RESOLVE_DOMAIN,
    });
    connectionGroup.add(resolveDomain);
    settings.bind('latency-resolve-domain', resolveDomain, 'text', Gio.SettingsBindFlags.DEFAULT);

    const refreshIntervalRow = new Adw.ActionRow({
        title: 'Refresh Interval (s)',
        subtitle: 'How often to run the ping check',
    });
    const refreshSpinner = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 1, upper: 3600, step_increment: 1, page_increment: 5,
            value: settings.get_int('latency-refresh-interval'),
        }),
        valign: Gtk.Align.CENTER,
        digits: 0,
    });
    refreshIntervalRow.add_suffix(refreshSpinner);
    refreshSpinner.connect('value-changed', () => {
        settings.set_int('latency-refresh-interval', refreshSpinner.get_value_as_int());
    });
    settings.connect('changed::latency-refresh-interval', () => {
        refreshSpinner.value = settings.get_int('latency-refresh-interval');
    });
    connectionGroup.add(refreshIntervalRow);

    // ── Thresholds group ────────────────────────────────────────────────────
    // Adw.SpinRow requires libadwaita 1.4 (GNOME 45+).
    // Use Adw.ActionRow + Gtk.SpinButton for GNOME 43/44 compatibility.
    const thresholdGroup = new Adw.PreferencesGroup({
        title: 'Color Thresholds',
        description: 'Latency is shown in green below warning, yellow below critical, red above critical',
    });
    page.add(thresholdGroup);

    const warningRow = new Adw.ActionRow({
        title: 'Warning threshold (ms)',
        subtitle: 'Above this value the indicator turns yellow',
    });
    const warningSpinner = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 1, upper: 10000, step_increment: 10, page_increment: 50,
            value: settings.get_int('latency-threshold-warning'),
        }),
        valign: Gtk.Align.CENTER,
        digits: 0,
    });
    warningRow.add_suffix(warningSpinner);
    warningSpinner.connect('value-changed', () => {
        settings.set_int('latency-threshold-warning', warningSpinner.get_value_as_int());
    });
    settings.connect('changed::latency-threshold-warning', () => {
        warningSpinner.value = settings.get_int('latency-threshold-warning');
    });
    thresholdGroup.add(warningRow);

    const criticalRow = new Adw.ActionRow({
        title: 'Critical threshold (ms)',
        subtitle: 'Above this value the indicator turns red',
    });
    const criticalSpinner = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 1, upper: 10000, step_increment: 10, page_increment: 50,
            value: settings.get_int('latency-threshold-critical'),
        }),
        valign: Gtk.Align.CENTER,
        digits: 0,
    });
    criticalRow.add_suffix(criticalSpinner);
    criticalSpinner.connect('value-changed', () => {
        settings.set_int('latency-threshold-critical', criticalSpinner.get_value_as_int());
    });
    settings.connect('changed::latency-threshold-critical', () => {
        criticalSpinner.value = settings.get_int('latency-threshold-critical');
    });
    thresholdGroup.add(criticalRow);

    // ── Colors group ────────────────────────────────────────────────────────
    const colorGroup = new Adw.PreferencesGroup({title: 'Colors'});
    page.add(colorGroup);

    colorGroup.add(_makeColorRow(
        'Normal color', 'Shown when latency is below the warning threshold',
        'latency-color-ok', settings
    ));
    colorGroup.add(_makeColorRow(
        'Warning color', 'Shown when latency is between warning and critical thresholds',
        'latency-color-warning', settings
    ));
    colorGroup.add(_makeColorRow(
        'Critical color', 'Shown when latency is above the critical threshold',
        'latency-color-critical', settings
    ));
}
