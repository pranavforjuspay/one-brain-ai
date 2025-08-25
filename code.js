// @ts-nocheck
// code.ts - UI Audit plugin logic
// Scans the document for common UI issues and reports to the UI
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var _this = this;
console.log('🚀 Backend code.ts loaded successfully!');
// Show UI
figma.showUI(__html__, { width: 520, height: 1200, themeColors: true, title: "UI Audit" });
console.log('🎯 UI shown, message handler about to be registered');
figma.ui.onmessage = function (msg) { return __awaiter(_this, void 0, void 0, function () {
    var spacingValue, error_1, message;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log('📨 Backend: Message handler triggered with:', msg);
                _a.label = 1;
            case 1:
                _a.trys.push([1, 6, , 7]);
                if (!(msg.type === 'scan-document')) return [3 /*break*/, 3];
                console.log('Backend: Full message received:', msg);
                console.log('Backend: msg.spacingValue =', msg.spacingValue);
                console.log('Backend: typeof msg.spacingValue =', typeof msg.spacingValue);
                spacingValue = msg.spacingValue || 4;
                console.log('Backend: Final spacing value used:', spacingValue);
                return [4 /*yield*/, runAudit(spacingValue)];
            case 2:
                _a.sent();
                return [2 /*return*/];
            case 3:
                if (msg.type === 'close') {
                    figma.closePlugin();
                    return [2 /*return*/];
                }
                if (!(msg.type === 'go-to-element')) return [3 /*break*/, 5];
                return [4 /*yield*/, goToElement(msg.elementId)];
            case 4:
                _a.sent();
                return [2 /*return*/];
            case 5: return [3 /*break*/, 7];
            case 6:
                error_1 = _a.sent();
                message = error_1 instanceof Error ? error_1.message : String(error_1);
                figma.notify("Plugin error: ".concat(message));
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); };
console.log('✅ Backend: Message handler registered successfully');
function runAudit(spacingValue) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, issues, _i, _b, page, _c, nodes, _loop_1, _d, nodes_1, node, spacingIssues, textStyleIssues, autolayoutIssues, otherIssues, results;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    if (!(typeof figma.loadAllPagesAsync === 'function')) return [3 /*break*/, 4];
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, figma.loadAllPagesAsync()];
                case 2:
                    _e.sent();
                    return [3 /*break*/, 4];
                case 3:
                    _a = _e.sent();
                    return [3 /*break*/, 4];
                case 4:
                    issues = [];
                    _i = 0, _b = figma.root.children;
                    _e.label = 5;
                case 5:
                    if (!(_i < _b.length)) return [3 /*break*/, 14];
                    page = _b[_i];
                    if (page.type !== 'PAGE')
                        return [3 /*break*/, 13];
                    if (!(typeof page.loadAsync === 'function')) return [3 /*break*/, 9];
                    _e.label = 6;
                case 6:
                    _e.trys.push([6, 8, , 9]);
                    return [4 /*yield*/, page.loadAsync()];
                case 7:
                    _e.sent();
                    return [3 /*break*/, 9];
                case 8:
                    _c = _e.sent();
                    return [3 /*break*/, 9];
                case 9:
                    nodes = page.findAll();
                    _loop_1 = function (node) {
                        var pageName, usesTextStyle, hasFills, hasStrokes, fillStyleMissing, strokeStyleMissing, which, rawPaddings, paddings, offenders, layoutMode, children_1, tolerance_1, allSameX, allSameY, x, y, w, h, mainComponent, _f;
                        return __generator(this, function (_g) {
                            switch (_g.label) {
                                case 0:
                                    pageName = page.name;
                                    // 1. Text nodes not linked to a text style
                                    if (node.type === 'TEXT') {
                                        usesTextStyle = 'textStyleId' in node && typeof node.textStyleId === 'string' && node.textStyleId !== '';
                                        if (!usesTextStyle) {
                                            issues.push({
                                                id: "text-style-missing-".concat(node.id),
                                                category: 'Text style missing',
                                                description: 'Text node is not linked to a text style.',
                                                elementName: node.name,
                                                elementId: node.id,
                                                pageName: pageName,
                                                frameName: getNearestSectionName(node) || 'Unknown'
                                            });
                                        }
                                    }
                                    // 2. Fills/strokes not linked to a color style
                                    if ('fills' in node || 'strokes' in node) {
                                        hasFills = 'fills' in node && Array.isArray(node.fills) && node.fills.length > 0;
                                        hasStrokes = 'strokes' in node && Array.isArray(node.strokes) && node.strokes.length > 0;
                                        fillStyleMissing = 'fillStyleId' in node && typeof node.fillStyleId === 'string' && node.fillStyleId === '' && hasFills;
                                        strokeStyleMissing = 'strokeStyleId' in node && typeof node.strokeStyleId === 'string' && node.strokeStyleId === '' && hasStrokes;
                                        if (fillStyleMissing || strokeStyleMissing) {
                                            which = fillStyleMissing && strokeStyleMissing ? 'Fill and stroke' : (fillStyleMissing ? 'Fill' : 'Stroke');
                                            issues.push({
                                                id: "color-style-missing-".concat(node.id),
                                                category: 'Color style missing',
                                                description: "".concat(which, " not linked to a color style."),
                                                elementName: node.name || 'Layer',
                                                elementId: node.id,
                                                pageName: pageName,
                                                frameName: getNearestSectionName(node) || 'Unknown'
                                            });
                                        }
                                    }
                                    // 3. Autolayout spacing/padding not multiples of specified value
                                    if ('layoutMode' in node && node.layoutMode !== 'NONE') {
                                        console.log("Checking autolayout node: ".concat(node.name, ", layoutMode: ").concat(node.layoutMode));
                                        rawPaddings = [
                                            node.paddingTop,
                                            node.paddingRight,
                                            node.paddingBottom,
                                            node.paddingLeft,
                                            node.itemSpacing
                                        ];
                                        console.log("Raw padding values for ".concat(node.name, ":"), rawPaddings);
                                        paddings = rawPaddings.filter(function (v) { return typeof v === 'number' && v > 0; });
                                        console.log("Filtered padding values for ".concat(node.name, ":"), paddings);
                                        console.log("Spacing value to check against: ".concat(spacingValue));
                                        if (paddings.length > 0) {
                                            offenders = paddings.filter(function (v) { return v % spacingValue !== 0; });
                                            console.log("Offenders for ".concat(node.name, ":"), offenders);
                                            if (offenders.length > 0) {
                                                console.log("Creating spacing issue for ".concat(node.name, ": spacing value = ").concat(spacingValue, ", offenders = ").concat(offenders));
                                                issues.push({
                                                    id: "autolayout-multiples-".concat(node.id),
                                                    category: 'Autolayout spacing',
                                                    description: "Padding/spacing not in multiples of ".concat(spacingValue, "px. Found: ").concat(offenders.join(', '), "px"),
                                                    elementName: node.name || 'Frame',
                                                    elementId: node.id,
                                                    pageName: pageName,
                                                    frameName: getNearestSectionName(node) || 'Unknown'
                                                });
                                            }
                                        }
                                    }
                                    // 4. Stacked children but no autolayout
                                    if ('children' in node && Array.isArray(node.children) && node.children.length >= 2) {
                                        layoutMode = 'layoutMode' in node ? node.layoutMode : 'NONE';
                                        if (layoutMode === 'NONE') {
                                            children_1 = node.children;
                                            tolerance_1 = 0.5;
                                            allSameX = children_1.every(function (c) { return 'x' in c && Math.abs(c.x - children_1[0].x) < tolerance_1; });
                                            allSameY = children_1.every(function (c) { return 'y' in c && Math.abs(c.y - children_1[0].y) < tolerance_1; });
                                            if (allSameX || allSameY) {
                                                issues.push({
                                                    id: "stacked-no-autolayout-".concat(node.id),
                                                    category: 'No autolayout',
                                                    description: 'Children are stacked but autolayout is not enabled.',
                                                    elementName: node.name || 'Frame',
                                                    elementId: node.id,
                                                    pageName: pageName,
                                                    frameName: getNearestSectionName(node) || 'Unknown'
                                                });
                                            }
                                        }
                                    }
                                    // 5. Non-integer positioning/size (not pixel-aligned)
                                    if ('x' in node && 'y' in node && 'width' in node && 'height' in node) {
                                        x = node.x;
                                        y = node.y;
                                        w = node.width;
                                        h = node.height;
                                        if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(w) || !Number.isInteger(h)) {
                                            issues.push({
                                                id: "pixel-align-".concat(node.id),
                                                category: 'Pixel alignment',
                                                description: 'x, y, width or height is not an integer.',
                                                elementName: node.name || 'Layer',
                                                elementId: node.id,
                                                pageName: pageName,
                                                frameName: getNearestSectionName(node) || 'Unknown'
                                            });
                                        }
                                    }
                                    if (!(node.type === 'INSTANCE')) return [3 /*break*/, 4];
                                    _g.label = 1;
                                case 1:
                                    _g.trys.push([1, 3, , 4]);
                                    return [4 /*yield*/, node.getMainComponentAsync()];
                                case 2:
                                    mainComponent = _g.sent();
                                    if (mainComponent === null) {
                                        issues.push({
                                            id: "detached-instance-".concat(node.id),
                                            category: 'Detached instance',
                                            description: 'Instance is detached from its main component.',
                                            elementName: node.name,
                                            elementId: node.id,
                                            pageName: pageName,
                                            frameName: getNearestSectionName(node) || 'Unknown'
                                        });
                                    }
                                    return [3 /*break*/, 4];
                                case 3:
                                    _f = _g.sent();
                                    return [3 /*break*/, 4];
                                case 4: return [2 /*return*/];
                            }
                        });
                    };
                    _d = 0, nodes_1 = nodes;
                    _e.label = 10;
                case 10:
                    if (!(_d < nodes_1.length)) return [3 /*break*/, 13];
                    node = nodes_1[_d];
                    return [5 /*yield**/, _loop_1(node)];
                case 11:
                    _e.sent();
                    _e.label = 12;
                case 12:
                    _d++;
                    return [3 /*break*/, 10];
                case 13:
                    _i++;
                    return [3 /*break*/, 5];
                case 14:
                    spacingIssues = issues.filter(function (i) { return i.category === 'Autolayout spacing'; }).map(function (issue) { return transformIssue(issue, spacingValue); });
                    textStyleIssues = issues.filter(function (i) { return i.category === 'Text style missing'; }).map(function (issue) { return transformIssue(issue, spacingValue); });
                    autolayoutIssues = issues.filter(function (i) { return i.category === 'No autolayout'; }).map(function (issue) { return transformIssue(issue, spacingValue); });
                    otherIssues = issues.filter(function (i) { return !['Autolayout spacing', 'Text style missing', 'No autolayout'].includes(i.category); }).map(function (issue) { return transformIssue(issue, spacingValue); });
                    results = {
                        fileName: figma.root.name || 'Untitled',
                        documentInfo: {
                            pageCount: figma.root.children.filter(function (p) { return p.type === 'PAGE'; }).length,
                            elementCount: issues.length
                        },
                        totalIssues: issues.length,
                        spacingIssues: spacingIssues,
                        textStyleIssues: textStyleIssues,
                        autolayoutIssues: __spreadArray(__spreadArray([], autolayoutIssues, true), otherIssues, true) // Include other issues in autolayout category
                    };
                    figma.ui.postMessage({ type: 'scan-complete', results: results });
                    return [2 /*return*/];
            }
        });
    });
}
function transformIssue(issue, spacingValue) {
    return {
        type: getIssueType(issue.category),
        title: issue.category,
        description: issue.description,
        element: issue.elementName,
        elementId: issue.elementId,
        pageName: issue.pageName,
        frameName: issue.frameName,
        suggestion: getSuggestion(issue.category, spacingValue)
    };
}
function getIssueType(category) {
    switch (category) {
        case 'Autolayout spacing': return 'spacing';
        case 'Text style missing': return 'text-style';
        case 'No autolayout': return 'autolayout';
        default: return 'autolayout'; // Group other issues under autolayout
    }
}
function getSuggestion(category, spacingValue) {
    switch (category) {
        case 'Autolayout spacing': return "Use multiples of ".concat(spacingValue, "px for consistent spacing");
        case 'Text style missing': return 'Link to a text style from your design system';
        case 'No autolayout': return 'Enable autolayout for better responsive design';
        case 'Color style missing': return 'Link to a color style from your design system';
        case 'Pixel alignment': return 'Ensure x, y, width, and height are whole numbers';
        case 'Detached instance': return 'Reconnect to the main component';
        default: return 'Review and fix this design issue';
    }
}
function getNearestSectionName(node) {
    var p = node;
    while (p) {
        if (p.type === 'SECTION') {
            return p.name || null;
        }
        p = p.parent || null;
    }
    return null;
}
function goToElement(elementId) {
    return __awaiter(this, void 0, void 0, function () {
        var node, _a, p, error_2, message;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 10, , 11]);
                    // Validate elementId
                    if (!elementId || typeof elementId !== 'string') {
                        figma.notify('Invalid element ID');
                        return [2 /*return*/];
                    }
                    if (!figma.getNodeByIdAsync) return [3 /*break*/, 2];
                    return [4 /*yield*/, figma.getNodeByIdAsync(elementId)];
                case 1:
                    _a = _b.sent();
                    return [3 /*break*/, 3];
                case 2:
                    _a = figma.getNodeById(elementId);
                    _b.label = 3;
                case 3:
                    node = _a;
                    if (!node) {
                        figma.notify('Element not found');
                        figma.ui.postMessage({ type: 'element-not-found' });
                        return [2 /*return*/];
                    }
                    p = node;
                    while (p && p.type !== 'PAGE') {
                        p = p.parent || null;
                    }
                    if (!(p && p.type === 'PAGE')) return [3 /*break*/, 6];
                    if (!(typeof figma.setCurrentPageAsync === 'function')) return [3 /*break*/, 5];
                    return [4 /*yield*/, figma.setCurrentPageAsync(p)];
                case 4:
                    _b.sent();
                    return [3 /*break*/, 6];
                case 5:
                    figma.currentPage = p;
                    _b.label = 6;
                case 6:
                    if (!('id' in node && node.id)) return [3 /*break*/, 8];
                    figma.currentPage.selection = [node];
                    return [4 /*yield*/, figma.viewport.scrollAndZoomIntoView([node])];
                case 7:
                    _b.sent();
                    figma.ui.postMessage({ type: 'element-focused' });
                    return [3 /*break*/, 9];
                case 8:
                    figma.notify('Cannot select this element');
                    _b.label = 9;
                case 9: return [3 /*break*/, 11];
                case 10:
                    error_2 = _b.sent();
                    message = error_2 instanceof Error ? error_2.message : String(error_2);
                    figma.notify("Navigation error: ".concat(message));
                    figma.ui.postMessage({ type: 'element-not-found' });
                    return [3 /*break*/, 11];
                case 11: return [2 /*return*/];
            }
        });
    });
}
