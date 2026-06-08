/**
 * @file data/default-user/extensions/structurize/index.js
 * @stamp {"utc":"2026-06-08T00:00:00.000Z"}
 * @version 1.0.9
 * @architectural-role Feature Entry Point
 * @description
 * SillyTavern Structurize — post-scan lorebook formatter that intercepts
 * the WORLDINFO_SCAN_DONE event and rewrites each activated entry's content
 * using a user-defined injection template before injection into the prompt.
 * Optionally prepends a global header line to the full entry block.
 *
 * No backend, no heavy dependencies. The transform runs entirely in the
 * post-scan hook that ST 1.15+ exposes for exactly this purpose. Optionally
 * appends a configurable footer line after the last entry.
 *
 * @core-principles
 * 1. TRANSFORM ONLY: This extension does not write to disk, mutate the
 *    lorebook, or send any AI requests. It only reshapes the in-memory
 *    scanState before ST finalises the prompt string.
 * 2. IDEMPOTENT GUARD: A marker flag (`_stx`) on each entry prevents
 *    double-formatting when the scan event fires multiple times per
 *    generation (chained activations, recursive scans).
 * 3. SETTINGS OWNED HERE: All user-facing options live in
 *    extension_settings.structurize. Defaults are applied on first load.
 * 4. NO SIDE EFFECTS: Does not register UI outside its own settings panel.
 *    Does not interfere with other extensions' scanState mutations.
 *
 * @api-declaration
 * Entry point: WORLDINFO_SCAN_DONE event handler.
 * Settings: loadSettings(), saveSettings().
 * Transform: formatEntries(scanState).
 *
 * @contract
 *   assertions:
 *     purity: mutates scanState only (in-memory, per-scan)
 *     state_ownership: [extension_settings.structurize]
 *     external_io: none
 */

import { eventSource, event_types, saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EXT_NAME = 'structurize';

// Keys for synthetic header/footer entries injected into the activated Map.
// Real entry keys are "worldName.uid"; these use a prefix that cannot collide.
const HEADER_KEY = '_stx.header';
const FOOTER_KEY = '_stx.footer';

// order values for synthetic entries. Real entries are clamped 0–9999 by ST's UI.
const HEADER_ORDER = -999999;  // sorts last in descending sort → injected first (top of WI block)
const FOOTER_ORDER = 999999;   // sorts first in descending sort → injected last (bottom of WI block)

const DEFAULTS = {
    enabled: true,
    verbose: false,
    showHeader: true,
    headerText: 'The following is an index of important characters and ideas from the story:',
    entryTemplate: '<{{title}}>\n{{keys}}\n{{content}}\n</{{title}}>',
    showFooter: true,
    footerText: '\nEnd Index\n',
};

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function log(event, data) {
    if (!getSettings().verbose) return;
    if (data !== undefined) console.log(`[${EXT_NAME}] ${event}`, data);
    else console.log(`[${EXT_NAME}] ${event}`);
}

// ---------------------------------------------------------------------------
// Settings helpers
// ---------------------------------------------------------------------------

function loadSettings() {
    extension_settings[EXT_NAME] ??= {};
    for (const [k, v] of Object.entries(DEFAULTS)) {
        extension_settings[EXT_NAME][k] ??= v;
    }
}

function getSettings() {
    return extension_settings[EXT_NAME];
}

// ---------------------------------------------------------------------------
// Core transform
// ---------------------------------------------------------------------------

function formatEntries(scanState) {
    log('WORLDINFO_SCAN_DONE fired', scanState);

    const settings = getSettings();
    if (!settings.enabled) {
        log('disabled — skipping');
        return;
    }

    // ST passes activated entries at scanState.activated.entries (a Map keyed by "world.uid")
    const activatedMap = scanState?.activated?.entries;
    if (!activatedMap?.size) {
        log('no activated entries — skipping', { size: activatedMap?.size ?? 'map missing' });
        return;
    }

    log(`formatting ${activatedMap.size} activated entries`);

    // Format each real entry (mutate content in-place; ST reads entry.content after this event).
    // Dummy entries (_stx.header / _stx.footer) have no comment so the guard below skips them.
    let formatted = 0;
    for (const entry of activatedMap.values()) {
        if (entry._stx) continue;   // already formatted (recursive scan guard)
        if (!entry.comment || !entry.content) {
            log(`skip (no title/content): uid=${entry.uid}`);
            continue;
        }
        const keys = Array.isArray(entry.key) && entry.key.length ? `(${entry.key.join(', ')})` : '';
        entry.content = settings.entryTemplate
            .replace(/\{\{title\}\}/g, entry.comment)
            .replace(/\{\{keys\}\}/g, keys)
            .replace(/\{\{content\}\}/g, entry.content);
        entry._stx = true;
        formatted++;
        log(`formatted entry: "${entry.comment}"`);
    }

    // Upsert synthetic header/footer entries into the activated Map.
    // ST's assembly loop sorts by order descending (b.order - a.order), so:
    //   HEADER_ORDER (999999) → before all real entries (max real order: 9999)
    //   FOOTER_ORDER (-999999) → after all real entries (min real order: 0)
    // We upsert on every firing so the Map always reflects current settings,
    // even across recursive scan passes.
    const hasReal = activatedMap.size > (activatedMap.has(HEADER_KEY) ? 1 : 0)
                                      + (activatedMap.has(FOOTER_KEY) ? 1 : 0);

    if (hasReal && settings.showHeader && settings.headerText) {
        activatedMap.set(HEADER_KEY, { content: settings.headerText, position: 0, order: HEADER_ORDER, _stx_synthetic: true });
        log('upserted header entry');
    } else {
        activatedMap.delete(HEADER_KEY);
    }

    if (hasReal && settings.showFooter && settings.footerText) {
        activatedMap.set(FOOTER_KEY, { content: settings.footerText, position: 0, order: FOOTER_ORDER, _stx_synthetic: true });
        log('upserted footer entry');
    } else {
        activatedMap.delete(FOOTER_KEY);
    }

    log(`done — formatted ${formatted} entries`);
}

// ---------------------------------------------------------------------------
// Settings panel
// ---------------------------------------------------------------------------

async function addSettingsPanel() {
    const html = `
<div id="structurize_settings">
    <div class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header">
            <b>Structurize</b>
            <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content">
            <label class="checkbox_label">
                <input type="checkbox" id="stx_enabled" />
                <span>Enable formatting</span>
            </label>
            <label class="checkbox_label">
                <input type="checkbox" id="stx_verbose" />
                <span>Verbose logging</span>
            </label>
            <label class="checkbox_label">
                <input type="checkbox" id="stx_show_header" />
                <span>Prepend global header</span>
            </label>
            <label for="stx_header_text">Header text</label>
            <textarea id="stx_header_text" class="text_pole" rows="2"></textarea>
            <label for="stx_entry_template">Entry template</label>
            <textarea id="stx_entry_template" class="text_pole" rows="4"></textarea>
            <small>Placeholders: {{title}}, {{keys}}, {{content}}. {{keys}} is empty when an entry has no keywords - put it on its own line to avoid a blank line in those entries.</small>
            <label class="checkbox_label">
                <input type="checkbox" id="stx_show_footer" />
                <span>Append global footer</span>
            </label>
            <label for="stx_footer_text">Footer text</label>
            <textarea id="stx_footer_text" class="text_pole" rows="2"></textarea>
        </div>
    </div>
</div>`;

    $('#extensions_settings2').append(html);

    const s = getSettings();

    // Populate
    $('#stx_enabled').prop('checked', s.enabled);
    $('#stx_verbose').prop('checked', s.verbose);
    $('#stx_show_header').prop('checked', s.showHeader);
    $('#stx_header_text').val(s.headerText);
    $('#stx_entry_template').val(s.entryTemplate);
    $('#stx_show_footer').prop('checked', s.showFooter);
    $('#stx_footer_text').val(s.footerText);

    // Wire up
    $('#stx_enabled').on('change', function () {
        getSettings().enabled = this.checked;
        saveSettingsDebounced();
    });
    $('#stx_verbose').on('change', function () {
        getSettings().verbose = this.checked;
        saveSettingsDebounced();
    });
    $('#stx_show_header').on('change', function () {
        getSettings().showHeader = this.checked;
        saveSettingsDebounced();
    });
    $('#stx_header_text').on('input', function () {
        getSettings().headerText = this.value;
        saveSettingsDebounced();
    });
    $('#stx_entry_template').on('input', function () {
        getSettings().entryTemplate = this.value;
        saveSettingsDebounced();
    });
    $('#stx_show_footer').on('change', function () {
        getSettings().showFooter = this.checked;
        saveSettingsDebounced();
    });
    $('#stx_footer_text').on('input', function () {
        getSettings().footerText = this.value;
        saveSettingsDebounced();
    });
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

loadSettings();
eventSource.on(event_types.WORLDINFO_SCAN_DONE, formatEntries);
// Remove synthetic header/footer entries before WORLD_INFO_ACTIVATED reaches other extensions
// (e.g. SillyTavern-WorldInfoInfo), which expect every entry to have a valid .world property.
// Structurize loads before WorldInfoInfo alphabetically, so this handler fires first.
eventSource.on(event_types.WORLD_INFO_ACTIVATED, (entryList) => {
    for (let i = entryList.length - 1; i >= 0; i--) {
        if (entryList[i]._stx_synthetic) entryList.splice(i, 1);
    }
});
addSettingsPanel();
