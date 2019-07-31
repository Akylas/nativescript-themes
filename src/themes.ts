/**********************************************************************************
 * (c) 2016-2019, Master Technology
 * Licensed under the MIT license or contact me for a Support or Commercial License
 *
 * I do contract work in most languages, so let me solve your problems!
 *
 * Any questions please feel free to email me or put a issue up on the github repo
 * Version 3.0.1                                      Nathan@master-technology.com
 *********************************************************************************/
// @ts-check

'use strict';

/* jshint camelcase: false */
/* global UIDevice, UIDeviceOrientation, getElementsByTagName, android */

import { File, knownFolders, path } from 'tns-core-modules/file-system';
// const fsa = (fs as any).FileSystemAccess;
// import * as frameCommon from 'tns-core-modules/ui/frame/frame-common';
import { Frame, topmost } from 'tns-core-modules/ui/frame';
import * as appSettings from 'tns-core-modules/application-settings';
import * as application from 'tns-core-modules/application';
import * as StyleScope from 'tns-core-modules/ui/styling/style-scope';

declare module 'tns-core-modules/ui/core/view' {
    interface View {
        _styleScope: any;
    }
}

let _priorTheme = '!!NO_THEME_LOADED!!';

// This allows some basic CSS to propogate properly from the frame; but not the localStyles CSS.  See bug NativeScript#5911 & #5912
// if (!frameCommon.FrameBase.prototype.eachChild) {
// 		frameCommon.FrameBase.prototype.eachChild = frameCommon.FrameBase.prototype.eachChildView;
// }

const _curAppPath = knownFolders.currentApp().path;

export function getAppliedTheme(defaultTheme: string = '') {
    if (appSettings.hasKey('__NS.themes')) {
        const theme = appSettings.getString('__NS.themes', defaultTheme);
        if (theme == null || theme === '') {
            return defaultTheme;
        }
        return theme;
    }
    return defaultTheme;
}

export interface Options {
	noSave?: boolean
}

export function applyTheme(cssFile: string, options?: Options) {
    if (!cssFile) {
        return;
    }
    if (!application.hasLaunched()) {
        const applyTheme = function() {
            internalLoadCssFile(cssFile, _curAppPath);
            if (!(options && !!options.noSave)) {
                appSettings.setString('__NS.themes', cssFile);
            }
            application.off('loadAppCss', applyTheme);
        };

        application.on('loadAppCss', applyTheme);
        return;
    }

    internalLoadCssFile(cssFile, _curAppPath);
    if (!(options && options.noSave)) {
        appSettings.setString('__NS.themes', cssFile);
    }
}

export function applyThemeCss(textCss: string, cssFileName: string) {
    internalLoadCss(textCss, cssFileName);
}

/**
 * Set the  theme .css file
 * @param cssFile - css file to load
 * @param path - application path
 */
function internalLoadCssFile(cssFile: string, curAppPath: string) {
    let cssFileName = cssFile;

    if (cssFileName.startsWith('~/')) {
        cssFileName = path.join(curAppPath, cssFileName.replace('~/', ''));
    } else if (cssFileName.startsWith('./')) {
        cssFileName = cssFileName.substring(2);
    }

    if (!cssFileName.startsWith(curAppPath)) {
        cssFileName = path.join(curAppPath, cssFileName);
    }

    let textCss = '';

    // Load the new Selectors
    if (cssFileName && File.exists(cssFileName)) {
        const file = File.fromPath(cssFileName);
        textCss = file.readTextSync();
    }

    internalLoadCss(textCss, cssFileName);
}

function internalLoadCss(textCss, cssFileName) {
    if (!topmost()) {
        setTimeout(function() {
            internalLoadCss(textCss, cssFileName);
        }, 50);
        return;
    }

    // Remove old Selectors
    let changed = StyleScope.removeTaggedAdditionalCSS(_priorTheme);

    if (textCss) {
        // Add new Selectors
        StyleScope.addTaggedAdditionalCSS(textCss, cssFileName);

        changed = true;
        _priorTheme = cssFileName;
    }

    if (changed) {
        const rootView = application.getRootView();
        if (rootView) {
            if (rootView._styleScope) {
                rootView._styleScope._localCssSelectorVersion++;
                rootView._styleScope.ensureSelectors();
                rootView._onCssStateChange();
            }
            // const backStack = (rootView as any).backStack;
            if (rootView instanceof Frame) {
                const backStack = rootView.backStack;
                for (let i = 0; i < backStack.length; i++) {
                    const page = backStack[i].resolvedPage;
                    if (page) {
                        // page._onCssStateChange();
                        // I suspect this method is probably safer; but the above actually does work...
                        page.once('navigatingTo', updatedCSSState);
                    }
                }
            }

            const frame = topmost();
            const page = frame && frame.currentPage;
            if (page) {
                page._onCssStateChange();
            }
        }
    }
}

function updatedCSSState(args) {
    const page = args.object;
    page._onCssStateChange();
}
