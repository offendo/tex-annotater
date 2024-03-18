"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeLink = exports.LinkType = void 0;
var LinkType;
(function (LinkType) {
    LinkType[LinkType["reference"] = 0] = "reference";
    LinkType[LinkType["nameof"] = 1] = "nameof";
})(LinkType || (exports.LinkType = LinkType = {}));
var makeLink = function (source, target) {
    return {
        start: target.start,
        end: target.end,
        tag: target.tag,
        fileid: target.fileid,
        color: target.color,
        source: source.annoid,
        target: target.annoid,
    };
};
exports.makeLink = makeLink;
