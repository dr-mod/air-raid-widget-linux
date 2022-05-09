imports.gi.versions.Gtk = "3.0";
const Main = imports.ui.main;
const Lang = imports.lang;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const {St, Gio, Soup, GLib} = imports.gi;
const ByteArray = imports.byteArray;

// Parameters
const api = 'http://sirens.in.ua/api/v1/';
const width = 240;
const x = 80;
const y = 40;
const opacity = 210;

const interval = 20 * 1000;
const height = width * 0.67;

let map;
let extension = null;
let icon;
let box;
let timer;

const AirRaidWidget = new Lang.Class({
    Name: 'AirRaidWidget',

    createBox: function () {
        const gicon = this.svg2Gicon(this.noDataMap(map));
        icon = new St.Icon({
            gicon: gicon,
            icon_size: width
        });
        icon.width = width;
        icon.height = height;
        let propBox = new St.BoxLayout();
        propBox.opacity = opacity;
        propBox.set_position(x, y);
        propBox.add_actor(icon);
        return propBox;
    },

    svg2Gicon: function (svg) {
        return Gio.BytesIcon.new(ByteArray.toGBytes(ByteArray.fromString(svg)));
    },

    changeColor: function (xml, region, color) {
        const regionName = this.escapeRegExp(region.trim())
        var replace = `(name="${regionName}" fill=".*?")|(name="${regionName}")`;
        var re = new RegExp(replace, "g");
        return xml.replace(re, `name="${regionName}" fill="${color}"`);
    },

    escapeRegExp: function (string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },

    updateRegions: function (map, pieces) {
        let current_state_map = map;
        Object.entries(pieces).forEach(([key, value]) => {
            if (value == "full") {
                current_state_map = this.changeColor(current_state_map, key, '#EF476F')
            } else if (value == "partial") {
                current_state_map = this.changeColor(current_state_map, key, '#FFD166')
            } else if (value == "no_data") {
                current_state_map = this.changeColor(current_state_map, key, '#118AB2')
            } else {
                current_state_map = this.changeColor(current_state_map, key, '#06D6A0')
            }
        });
        return current_state_map;
    },

    noDataMap: function (map) {
        var replace = `(?:name="(.*?)" fill=".*?")|(?:name="(.*?)")`;
        var re = new RegExp(replace, "g");
        return map.replace(re, `name="$1$2" fill="#118AB2"`);
    },

    updateWidget: function () {
        try {
            const session = new Soup.SessionAsync({timeout: 10});
            let message = Soup.form_request_new_from_hash('GET', api, {});
            session.queue_message(message, () => {
                try {
                    const obj = JSON.parse(message.response_body.data);
                    icon.set_gicon(this.svg2Gicon(this.updateRegions(map, obj)));
                } catch (e) {
                    icon.set_gicon(this.svg2Gicon(this.noDataMap(map)));
                }
            });
        } catch (e) {
            icon.set_gicon(this.svg2Gicon(this.noDataMap(map)));
        }
    },

    enable: function () {
        box = this.createBox();
        Main.layoutManager._backgroundGroup.add_actor(box);
        this.updateWidget();
        timer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, interval, () => {
            this.updateWidget();
            return GLib.SOURCE_CONTINUE;
        });
    },

    disable: function () {
        GLib.source_remove(timer);
        Main.layoutManager._backgroundGroup.remove_actor(box);
    },
});

function init() {
    const file = Gio.File.new_for_path(Me.path + "/ua.svg");
    const [, contents, etag] = file.load_contents(null);
    map = ByteArray.toString(contents);
}

function enable() {
    extension = new AirRaidWidget();
    extension.enable();
}

function disable() {
    extension.disable();
    extension = null;
}