import Gio from 'gi://Gio';
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const DEFAULT_WAN_IP = '8.8.8.8';
const DEFAULT_RESOLVE_DOMAIN = 'google.com';

export default class LatencyPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
    const _settings = this.getSettings();

        // Create a preferences page, with a single group
        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'dialog-information-symbolic',
        });
        window.add(page);

        const group = new Adw.PreferencesGroup({
            title: _('Display Options'),
            description: _('Configure how latency information is displayed'),
        });
        page.add(group);

        // Create a new preferences row
        const latencyLabel = new Adw.SwitchRow({
            title: _('Show "Latency" Label'),
            subtitle: _('Display the word "Latency:" before the ping value'),
        });
        group.add(latencyLabel);

        const ipWan = new Adw.EntryRow({
            title: _('IP WAN Address'),
            text: _settings.get_string('latency-ip-wan') || DEFAULT_WAN_IP,
        });
        group.add(ipWan);

        const resolveDomain = new Adw.EntryRow({
            title: _('Resolve Domain'),
            text: _settings.get_string('latency-resolve-domain') || DEFAULT_RESOLVE_DOMAIN,
        });
        group.add(resolveDomain);

        // Create a settings object
        window._settings = this.getSettings();

        // Bind the switch to our `show-latency-label` key
        window._settings.bind(
            'show-latency-label',
            latencyLabel,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );

        // Bind the entry rows to their respective GSettings keys
        window._settings.bind(
            'latency-ip-wan',
            ipWan,
            'text',
            Gio.SettingsBindFlags.DEFAULT
        );
        window._settings.bind(
            'latency-resolve-domain',
            resolveDomain,
            'text',
            Gio.SettingsBindFlags.DEFAULT
        );
    }
}
