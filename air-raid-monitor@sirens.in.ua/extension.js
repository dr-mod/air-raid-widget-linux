'use strict';

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();


function init() {
    log(`initializing ${Me.metadata.name}`);
}


function enable() {
    log(`enabling ${Me.metadata.name}`);
}


function disable() {
    log(`disabling ${Me.metadata.name}`);
}