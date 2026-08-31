"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => VaultInspectorPlugin,
  migrateExcalidrawFrontmatterKey: () => migrateExcalidrawFrontmatterKey
});
module.exports = __toCommonJS(main_exports);
var import_obsidian9 = require("obsidian");

// src/report/InspectorView.ts
var import_obsidian4 = require("obsidian");

// src/scanner/Issue.ts
var SCANNER_IDS = [
  "broken-links",
  "orphan-attachments",
  "empty-notes",
  "external-links",
  "duplicate-files",
  "frontmatter-types",
  "tag-usage",
  "large-files"
];
var SCANNER_LABELS = {
  "broken-links": "Broken Links",
  "orphan-attachments": "Orphan Attachments",
  "empty-notes": "Empty Notes",
  "external-links": "External Links",
  "duplicate-files": "Duplicate Files",
  "frontmatter-types": "Frontmatter Types",
  "tag-usage": "Tag Usage",
  "large-files": "Large Files"
};

// src/report/report-model.ts
var SEVERITIES = ["error", "warning", "info"];
var STATUSES = ["new", "persisting"];
var CLASSIFICATIONS = ["confirmed", "candidate", "unverified"];
var SCANNER_RANK = new Map(SCANNER_IDS.map((scannerId, index) => [scannerId, index]));
function buildIssueFilterView(issues, filters, statuses = /* @__PURE__ */ new Map()) {
  var _a, _b, _c, _d;
  const statusFilter = filters.status;
  const classificationFilter = filters.classification;
  const matchesScanner = (issue) => !filters.scanner || issue.scannerId === filters.scanner;
  const matchesSeverity = (issue) => !filters.severity || issue.severity === filters.severity;
  const matchesStatus = (issue) => !statusFilter || statuses.get(issue.fingerprint) === statusFilter;
  const matchesClassification = (issue) => !classificationFilter || issue.classification === classificationFilter;
  const matchingIssues = issues.filter(
    (issue) => matchesScanner(issue) && matchesSeverity(issue) && matchesStatus(issue) && matchesClassification(issue)
  );
  const visibleIssues = matchingIssues.sort(
    (left, right) => compareIssues(left, right, statuses)
  );
  const scannerCounts = /* @__PURE__ */ new Map();
  for (const issue of issues) scannerCounts.set(issue.scannerId, 0);
  for (const issue of issues) {
    if (!matchesSeverity(issue) || !matchesStatus(issue) || !matchesClassification(issue)) continue;
    scannerCounts.set(issue.scannerId, ((_a = scannerCounts.get(issue.scannerId)) != null ? _a : 0) + 1);
  }
  const severityCounts = new Map(
    SEVERITIES.map((severity) => [severity, 0])
  );
  for (const issue of issues) {
    if (!matchesScanner(issue) || !matchesStatus(issue) || !matchesClassification(issue)) continue;
    severityCounts.set(issue.severity, ((_b = severityCounts.get(issue.severity)) != null ? _b : 0) + 1);
  }
  const severityFacets = SEVERITIES.map((severity) => {
    var _a2;
    return { severity, count: (_a2 = severityCounts.get(severity)) != null ? _a2 : 0 };
  }).filter(({ severity, count }) => count > 0 || filters.severity === severity);
  const statusCounts = new Map(
    STATUSES.map((status) => [status, 0])
  );
  for (const issue of issues) {
    if (!matchesScanner(issue) || !matchesSeverity(issue) || !matchesClassification(issue)) continue;
    const status = statuses.get(issue.fingerprint);
    if (status) statusCounts.set(status, ((_c = statusCounts.get(status)) != null ? _c : 0) + 1);
  }
  const statusFacets = STATUSES.map((status) => {
    var _a2;
    return { status, count: (_a2 = statusCounts.get(status)) != null ? _a2 : 0 };
  }).filter(({ status, count }) => count > 0 || statusFilter === status);
  const classificationCounts = new Map(
    CLASSIFICATIONS.map((classification) => [classification, 0])
  );
  for (const issue of issues) {
    if (!matchesScanner(issue) || !matchesSeverity(issue) || !matchesStatus(issue)) continue;
    classificationCounts.set(
      issue.classification,
      ((_d = classificationCounts.get(issue.classification)) != null ? _d : 0) + 1
    );
  }
  const classificationFacets = CLASSIFICATIONS.map((classification) => {
    var _a2;
    return {
      classification,
      count: (_a2 = classificationCounts.get(classification)) != null ? _a2 : 0
    };
  }).filter(
    ({ classification, count }) => count > 0 || classificationFilter === classification
  );
  return {
    visibleIssues,
    scannerCounts,
    severityFacets,
    statusFacets,
    classificationFacets
  };
}
function compareIssues(left, right, statuses) {
  var _a, _b;
  const rankDifference = issueRank(left, statuses) - issueRank(right, statuses);
  if (rankDifference !== 0) return rankDifference;
  const scannerDifference = ((_a = SCANNER_RANK.get(left.scannerId)) != null ? _a : SCANNER_IDS.length) - ((_b = SCANNER_RANK.get(right.scannerId)) != null ? _b : SCANNER_IDS.length);
  if (scannerDifference !== 0) return scannerDifference;
  const pathDifference = compareStrings(issuePath(left), issuePath(right));
  if (pathDifference !== 0) return pathDifference;
  return compareStrings(left.fingerprint, right.fingerprint);
}
function issueRank(issue, statuses) {
  if (issue.classification === "candidate") return 4;
  if (issue.classification === "unverified") return 5;
  if (statuses.get(issue.fingerprint) !== "new") return 3;
  return SEVERITIES.indexOf(issue.severity);
}
function issuePath(issue) {
  var _a, _b;
  return (_b = (_a = issue.primaryPath) != null ? _a : issue.relatedPaths[0]) != null ? _b : "";
}
function compareStrings(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

// src/utils/format.ts
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function formatDuration(ms) {
  const safeMs = Math.max(0, Math.round(ms));
  if (safeMs < 1e3) return `${safeMs}ms`;
  const seconds = safeMs / 1e3;
  if (seconds < 10) return `${seconds.toFixed(1)}s`;
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  if (remainingSeconds === 60) return `${minutes + 1}m 00s`;
  return `${minutes}m ${remainingSeconds.toString().padStart(2, "0")}s`;
}

// src/report/render-summary.ts
function renderSummary(container, result, options) {
  var _a;
  const duration = formatDuration(result.finishedAt - result.startedAt);
  const summary = container.createDiv({ cls: "vi-summary" });
  summary.createEl("h2", { text: "Scan results" });
  const stats = summary.createDiv({ cls: "vi-stats" });
  const items = [{
    label: "Active",
    value: result.issues.length,
    cls: "vi-stat-active"
  }];
  if (options.comparison.available) {
    items.push(
      {
        label: "New",
        value: countStatus(result, options.comparison, "new"),
        cls: "vi-stat-new",
        status: "new"
      },
      {
        label: "Persisting",
        value: countStatus(result, options.comparison, "persisting"),
        cls: "vi-stat-persisting",
        status: "persisting"
      },
      {
        label: "Resolved",
        value: options.comparison.resolvedIssues.filter((issue) => !issue.ignored).length,
        cls: "vi-stat-resolved"
      }
    );
  }
  for (const item of items) {
    const status = item.status;
    const onFilterStatus = options.onFilterStatus;
    const isFilter = status !== void 0 && onFilterStatus !== void 0;
    const cls = `vi-stat ${item.cls}${isFilter ? " vi-stat-clickable" : ""}`;
    const stat = isFilter ? stats.createEl("button", { cls, attr: { type: "button" } }) : stats.createDiv({ cls });
    stat.createSpan({ cls: "vi-stat-label", text: item.label });
    stat.createSpan({ cls: "vi-stat-value", text: String(item.value) });
    if (status !== void 0 && onFilterStatus) {
      stat.addEventListener("click", () => onFilterStatus(status));
    }
  }
  if (!options.comparison.available) {
    summary.createDiv({
      cls: "vi-comparison-note",
      text: unavailableMessage((_a = options.comparison.reason) != null ? _a : "first-scan")
    });
  }
  const meta = summary.createDiv({ cls: "vi-meta" });
  meta.createSpan({ text: `${result.filesScanned} files scanned` });
  meta.createSpan({ text: duration });
  meta.createSpan({ text: `${result.scannersRun.length} scanners` });
  meta.createSpan({ text: `Ignored ${result.ignoredIssues.length}` });
}
function countStatus(result, comparison, status) {
  return result.issues.filter(
    (issue) => comparison.statuses.get(issue.fingerprint) === status
  ).length;
}
function unavailableMessage(reason) {
  if (reason === "settings-changed") {
    return "Scan settings changed; this scan starts a new comparison baseline";
  }
  if (reason === "semantics-changed") {
    return "Scanner behavior changed; this scan starts a new comparison baseline";
  }
  return "No previous successful scan for these settings";
}

// src/report/render-evidence.ts
function renderFindingEvidence(container, issue) {
  var _a;
  container.createSpan({
    cls: `vi-classification-badge vi-classification-${issue.classification}`,
    text: issue.classification.toUpperCase()
  });
  const explanation = container.createDiv({ cls: "vi-explanation" });
  renderRow(explanation, "Why", issue.explanation.why);
  if ((_a = issue.explanation.caveat) == null ? void 0 : _a.trim()) {
    renderRow(explanation, "Caveat", issue.explanation.caveat);
  }
  renderRow(explanation, "Next", issue.explanation.nextStep);
  const disclosure = container.createEl("details", { cls: "vi-evidence-disclosure" });
  disclosure.addEventListener("click", (event) => event.stopPropagation());
  disclosure.createEl("summary", { text: "Evidence" });
  for (const key of Object.keys(issue.evidence).sort()) {
    renderRow(disclosure, key, String(issue.evidence[key]));
  }
}
function renderRow(container, label, value) {
  const row = container.createDiv({ cls: "vi-explanation-row" });
  row.createSpan({ cls: "vi-explanation-label", text: label });
  row.createSpan({ cls: "vi-explanation-value", text: value });
}

// src/report/render-issues.ts
var import_obsidian = require("obsidian");

// src/utils/paths.ts
function normalizePath(path) {
  return path.replace(/\\/g, "/").replace(/\/+$/, "");
}
function getParentFolder(path) {
  const normalized = normalizePath(path);
  const slashIndex = normalized.lastIndexOf("/");
  if (slashIndex <= 0) return null;
  return normalized.slice(0, slashIndex);
}
function getExtension(path) {
  const normalized = normalizePath(path);
  const dotIndex = normalized.lastIndexOf(".");
  if (dotIndex === -1 || dotIndex < normalized.lastIndexOf("/")) return "";
  return normalized.slice(dotIndex + 1).toLowerCase();
}
function getBasename(path) {
  const normalized = normalizePath(path);
  const slashIndex = normalized.lastIndexOf("/");
  const name = slashIndex === -1 ? normalized : normalized.slice(slashIndex + 1);
  const dotIndex = name.lastIndexOf(".");
  return dotIndex === -1 ? name : name.slice(0, dotIndex);
}
function isInFolder(path, folder) {
  const normalized = normalizePath(path);
  const normalizedFolder = normalizePath(folder).replace(/\/+$/, "");
  return normalized === normalizedFolder || normalized.startsWith(normalizedFolder + "/");
}
function isIgnoredPath(path, ignoredFolders) {
  return ignoredFolders.some((folder) => isInFolder(path, folder));
}
function matchesGlob(path, glob) {
  const globstarSlashPlaceholder = "__VI_GLOBSTAR_SLASH__";
  const globstarPlaceholder = "__VI_GLOBSTAR__";
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*\//g, globstarSlashPlaceholder).replace(/\*\*/g, globstarPlaceholder).replace(/\*/g, "[^/]*");
  const pattern = escaped.split(globstarSlashPlaceholder).join("(?:.*/)?").split(globstarPlaceholder).join(".*");
  return new RegExp(`^${pattern}$`).test(path);
}

// src/report/render-issues.ts
function renderIssueList(container, config) {
  var _a, _b;
  const grouped = groupByScanner(config.issues);
  for (const scannerId of config.scannersRun) {
    const scannerIssues = (_a = grouped[scannerId]) != null ? _a : [];
    if (scannerIssues.length === 0) continue;
    const section = container.createDiv({ cls: "vi-scanner-section" });
    section.createEl("h3", {
      cls: "vi-scanner-header",
      text: `${SCANNER_LABELS[scannerId]} (${scannerIssues.length})`
    });
    const list = section.createEl("ul", { cls: "vi-issue-list" });
    for (const issue of scannerIssues) {
      const isSelected = config.selectedFingerprints.has(issue.fingerprint);
      const cls = [
        "vi-issue",
        `vi-severity-${issue.severity}`,
        config.selectionMode ? "vi-selectable" : "",
        isSelected ? "vi-selected" : ""
      ].filter(Boolean).join(" ");
      const li = list.createEl("li", { cls });
      if (config.selectionMode) {
        const checkbox = li.createEl("input", { cls: "vi-issue-checkbox", type: "checkbox" });
        checkbox.checked = isSelected;
        checkbox.addEventListener("click", (e) => {
          e.stopPropagation();
          config.onToggleSelect(issue);
        });
        li.addEventListener("click", () => config.onToggleSelect(issue));
      }
      li.createSpan({
        cls: `vi-severity-badge vi-severity-${issue.severity}`,
        text: issue.severity.toUpperCase()
      });
      const status = (_b = config.statuses) == null ? void 0 : _b.get(issue.fingerprint);
      if (status) {
        li.createSpan({
          cls: `vi-status-badge vi-status-${status}`,
          text: status.toUpperCase()
        });
      }
      li.createSpan({ cls: "vi-issue-title", text: issue.title });
      const issuePath2 = getIssuePath(issue);
      if (issuePath2) {
        const pathEl = li.createSpan({
          cls: "vi-issue-path",
          text: issuePath2
        });
        (0, import_obsidian.setTooltip)(pathEl, "Click to open issue location");
        pathEl.addEventListener("click", (e) => {
          e.stopPropagation();
          if (hasActiveTextSelection()) return;
          config.onOpenIssue(makePathIssue(issue, issuePath2));
        });
      }
      renderIssueDetails(li, issue, config);
    }
  }
}
function hasActiveTextSelection() {
  var _a;
  return ((_a = window.getSelection()) == null ? void 0 : _a.toString().trim().length) ? true : false;
}
function renderIssueDetails(container, issue, config) {
  var _a;
  const details = container.createDiv({ cls: "vi-issue-details" });
  const summary = getIssueSummary(issue);
  if (summary) details.createDiv({ cls: "vi-issue-message", text: summary });
  for (const row of getIssueDetailRows(issue)) {
    const rowEl = details.createDiv({ cls: "vi-issue-target" });
    rowEl.createSpan({ cls: "vi-issue-target-label", text: row.label });
    const valueEl = rowEl.createSpan({ cls: "vi-issue-target-value" });
    if ("value" in row) {
      valueEl.setText(row.value);
    } else {
      for (const item of row.items) {
        const itemEl = valueEl.createSpan({
          cls: `vi-issue-value-token ${(_a = item.className) != null ? _a : ""}`.trim(),
          text: item.text
        });
        if (!item.issue) continue;
        itemEl.addClass("vi-issue-value-clickable");
        (0, import_obsidian.setTooltip)(itemEl, "Click to open issue location");
        itemEl.addEventListener("click", (event) => {
          event.stopPropagation();
          if (hasActiveTextSelection()) return;
          config.onOpenIssue(item.issue);
        });
      }
    }
  }
  renderFindingEvidence(details, issue);
  renderIssueActions(details, issue, config);
}
function renderIssueActions(container, issue, config) {
  const issuePath2 = getIssuePath(issue);
  const canExcludeFolder = Boolean(
    config.onExcludeFolder && issuePath2 && getParentFolder(issuePath2)
  );
  if (!config.onIgnoreIssue && !canExcludeFolder && !config.onOpenScannerSettings) {
    return;
  }
  const disclosure = container.createEl("details", { cls: "vi-actions-disclosure" });
  disclosure.addEventListener("click", (event) => event.stopPropagation());
  disclosure.createEl("summary", { text: "Actions" });
  const actions = disclosure.createDiv({ cls: "vi-context-actions" });
  if (config.onIgnoreIssue) {
    createActionButton(actions, "Ignore this issue", () => {
      var _a;
      (_a = config.onIgnoreIssue) == null ? void 0 : _a.call(config, issue);
    });
  }
  if (canExcludeFolder) {
    createActionButton(actions, "Exclude parent folder", () => {
      var _a;
      (_a = config.onExcludeFolder) == null ? void 0 : _a.call(config, issue);
    });
  }
  if (config.onOpenScannerSettings) {
    createActionButton(actions, "Scanner settings", () => {
      var _a;
      (_a = config.onOpenScannerSettings) == null ? void 0 : _a.call(config, issue.scannerId);
    });
  }
}
function createActionButton(container, text, onClick) {
  container.createEl("button", {
    cls: "vi-action-btn",
    text,
    attr: { type: "button" }
  }).addEventListener("click", (event) => {
    event.stopPropagation();
    onClick();
  });
}
function getIssueSummary(issue) {
  switch (issue.scannerId) {
    case "external-links":
      return getExternalLinkSummary(issue);
    case "large-files": {
      const size = getNumber(issue.evidence.size);
      const threshold = getNumber(issue.evidence.threshold);
      if (size !== null && threshold !== null) {
        return `File is ${formatSize(size)}, over ${formatSize(threshold)} threshold`;
      }
      return issue.message;
    }
    case "orphan-attachments": {
      const lastModified = getNumber(issue.evidence.lastModified);
      return lastModified !== null ? `Not referenced by any note \xB7 modified ${formatDate(lastModified)}` : issue.message;
    }
    case "empty-notes": {
      const size = getNumber(issue.evidence.size);
      return size !== null ? `No content besides frontmatter/title \xB7 ${formatSize(size)}` : issue.message;
    }
    default:
      return issue.message;
  }
}
function getExternalLinkSummary(issue) {
  if (issue.title === "External link check timed out") {
    const timeoutMs = getNumber(issue.evidence.timeoutMs);
    return timeoutMs !== null ? `Timed out after ${timeoutMs}ms` : "Timed out";
  }
  if (issue.title === "External link check failed") {
    const error = issue.evidence.error;
    return typeof error === "string" && error.length > 0 ? `Request failed: ${error}` : "Request failed";
  }
  if (issue.title === "Dead external link") {
    const status = getNumber(issue.evidence.status);
    return status !== null ? `HTTP ${status}` : "HTTP error";
  }
  return issue.message;
}
function getIssueDetailRows(issue) {
  const rows = [];
  const target = getIssueTarget(issue);
  if (target) {
    rows.push({
      label: getTargetLabel(issue),
      items: [{
        text: target,
        issue: makeTargetIssue(issue, target),
        className: "vi-issue-token-monospace"
      }]
    });
  }
  if (issue.scannerId === "duplicate-files") {
    const count = getNumber(issue.evidence.count);
    if (count !== null) rows.push({ label: "Count", value: String(count) });
    const paths = getEvidencePaths(issue);
    if (paths.length > 0) {
      rows.push({
        label: "Files",
        items: paths.map((path) => ({
          text: path,
          issue: makePathIssue(issue, path),
          className: "vi-issue-path-token"
        }))
      });
    }
  }
  if (issue.scannerId === "frontmatter-types") {
    const property = issue.evidence.property;
    const types = issue.evidence.types;
    const fileCount = getNumber(issue.evidence.fileCount);
    if (typeof property === "string") {
      rows.push({
        label: "Property",
        items: [{
          text: property,
          issue: issue.relatedPaths.length > 0 ? makePropertyIssue(issue, property) : void 0,
          className: "vi-issue-token-monospace"
        }]
      });
    }
    if (typeof types === "string") rows.push({ label: "Types", value: types });
    if (fileCount !== null) rows.push({ label: "Files", value: String(fileCount) });
    if (issue.relatedPaths.length > 0) {
      rows.push({
        label: "Sample",
        items: issue.relatedPaths.map((path) => ({
          text: path,
          issue: makePathIssue(issue, path),
          className: "vi-issue-path-token"
        }))
      });
    }
  }
  if (issue.scannerId === "tag-usage") {
    const tag = issue.evidence.tag;
    const count = getNumber(issue.evidence.count);
    const threshold = getNumber(issue.evidence.threshold);
    if (typeof tag === "string") {
      rows.push({
        label: "Tag",
        items: [{
          text: formatTag(tag),
          issue: issue.primaryPath ? makeTagIssue(issue, tag) : void 0,
          className: "vi-issue-tag-token"
        }]
      });
    }
    if (count !== null) rows.push({ label: "Count", value: String(count) });
    if (threshold !== null) rows.push({ label: "Threshold", value: String(threshold) });
  }
  if (issue.scannerId === "large-files") {
    const type = issue.evidence.type;
    if (typeof type === "string") rows.push({ label: "Type", value: type });
  }
  return rows;
}
function makePathIssue(issue, path) {
  return {
    ...issue,
    primaryPath: path,
    relatedPaths: issue.relatedPaths.filter((relatedPath) => relatedPath !== path)
  };
}
function makeTargetIssue(issue, target) {
  const evidence = { ...issue.evidence };
  if (issue.scannerId === "external-links") {
    evidence.url = target;
  } else if (issue.scannerId === "broken-links") {
    evidence.target = target;
  } else {
    evidence.link = target;
  }
  return {
    ...issue,
    evidence
  };
}
function makeTagIssue(issue, tag) {
  return {
    ...issue,
    evidence: {
      ...issue.evidence,
      tag
    }
  };
}
function makePropertyIssue(issue, property) {
  var _a;
  return {
    ...issue,
    primaryPath: (_a = issue.primaryPath) != null ? _a : issue.relatedPaths[0],
    evidence: {
      ...issue.evidence,
      property
    }
  };
}
function getIssueTarget(issue) {
  const url = issue.evidence.url;
  if (typeof url === "string") return url;
  const link = issue.evidence.link;
  if (typeof link === "string") return link;
  const target = issue.evidence.target;
  if (typeof target === "string") return target;
  return null;
}
function getTargetLabel(issue) {
  if (issue.scannerId === "external-links") return "URL";
  if (issue.scannerId === "broken-links") return "Target";
  return "Target";
}
function getEvidencePaths(issue) {
  const paths = issue.evidence.paths;
  if (typeof paths !== "string") return issue.relatedPaths;
  return paths.split(",").map((path) => path.trim()).filter(Boolean);
}
function getNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString();
}
function getIssuePath(issue) {
  var _a, _b;
  return (_b = (_a = issue.primaryPath) != null ? _a : issue.relatedPaths[0]) != null ? _b : null;
}
function formatTag(tag) {
  return tag.startsWith("#") ? tag : `#${tag}`;
}
function groupByScanner(issues) {
  const groups = {};
  for (const issue of issues) {
    if (!groups[issue.scannerId]) groups[issue.scannerId] = [];
    groups[issue.scannerId].push(issue);
  }
  return groups;
}

// src/report/render-changes.ts
function renderResolvedChanges(container, issues) {
  for (const issue of issues) {
    const item = container.createDiv({ cls: "vi-resolved-item" });
    item.createSpan({
      cls: "vi-status-badge vi-status-resolved",
      text: "RESOLVED"
    });
    item.createSpan({
      cls: "vi-resolved-scanner",
      text: SCANNER_LABELS[issue.scannerId]
    });
    item.createSpan({ cls: "vi-resolved-title", text: issue.title });
    if (issue.primaryPath) {
      item.createSpan({ cls: "vi-issue-path", text: issue.primaryPath });
    }
    if (issue.ignored) {
      item.createSpan({
        cls: "vi-resolved-ignored",
        text: "Previously ignored"
      });
    }
  }
}

// src/fix/action-outcomes.ts
function summarizeOperationOutcomes(outcomes) {
  return {
    ignored: outcomes.filter((item) => item.outcome === "ignored").length,
    restored: outcomes.filter((item) => item.outcome === "restored").length,
    excluded: outcomes.filter((item) => item.outcome === "excluded").length,
    fixed: outcomes.filter((item) => item.outcome === "fixed").length,
    stillPresent: outcomes.filter((item) => item.outcome === "still-present").length,
    skipped: outcomes.filter((item) => item.outcome === "skipped").length,
    failed: outcomes.filter((item) => item.outcome === "failed").length
  };
}

// src/report/render-outcomes.ts
var OUTCOME_LABELS = {
  ignored: "Ignored",
  restored: "Restored",
  excluded: "Excluded",
  fixed: "Fixed",
  "still-present": "Still present",
  skipped: "Skipped",
  failed: "Failed"
};
function renderOperationOutcomes(container, outcomes, onDismiss) {
  if (outcomes.length === 0) return;
  const panel = container.createDiv({ cls: "vi-outcomes" });
  const header = panel.createDiv({ cls: "vi-outcomes-header" });
  const summary = summarizeOperationOutcomes(outcomes);
  const counts = [
    ["Fixed", summary.fixed],
    ["Still present", summary.stillPresent],
    ["Skipped", summary.skipped],
    ["Failed", summary.failed],
    ["Ignored", summary.ignored],
    ["Restored", summary.restored],
    ["Excluded", summary.excluded]
  ];
  header.createDiv({
    cls: "vi-outcomes-summary",
    text: counts.filter(([, count]) => count > 0).map(([label, count]) => `${label} ${count}`).join(" \xB7 "),
    attr: { role: "status", "aria-live": "polite" }
  });
  const dismiss = header.createEl("button", {
    cls: "vi-outcomes-dismiss",
    text: "Dismiss",
    attr: { type: "button" }
  });
  dismiss.addEventListener("click", onDismiss);
  const details = panel.createEl("details", { cls: "vi-outcomes-details" });
  details.createEl("summary", { text: "Details" });
  const list = details.createEl("ul", { cls: "vi-outcomes-list" });
  for (const outcome of outcomes) {
    const item = list.createEl("li", { cls: "vi-outcome-item" });
    item.createSpan({
      cls: `vi-outcome-label vi-outcome-${outcome.outcome}`,
      text: OUTCOME_LABELS[outcome.outcome]
    });
    item.createDiv({ cls: "vi-outcome-message", text: outcome.message });
    if ("phase" in outcome && outcome.phase) {
      item.createDiv({
        cls: "vi-outcome-phase",
        text: `Phase: ${outcome.phase}`
      });
    }
    if (outcome.affectedPaths.length > 0) {
      const paths = item.createEl("ul", { cls: "vi-outcome-paths" });
      for (const path of outcome.affectedPaths) {
        paths.createEl("li", { text: path });
      }
    }
  }
}

// src/report/InspectorView.ts
var import_obsidian5 = require("obsidian");

// src/fix/confirm-modal.ts
var import_obsidian2 = require("obsidian");

// src/fix/fix-decisions.ts
function buildFixDecisionState(issues, mode, selectedKeeps) {
  const decisions = [];
  let complete = true;
  for (const issue of issues) {
    const action = issue.fixAction;
    if (!action) continue;
    const selection = action.selection;
    if (!selection) {
      decisions.push({ fingerprint: issue.fingerprint });
      continue;
    }
    const keepPath = mode === "automatic" ? selection.automaticKeepPath : selectedKeeps.get(issue.fingerprint);
    if (!keepPath || !selection.candidatePaths.includes(keepPath)) {
      complete = false;
      continue;
    }
    decisions.push({ fingerprint: issue.fingerprint, keepPath });
  }
  return { complete, decisions };
}
function resolveDecisionAction(issue, decision) {
  const action = issue.fixAction;
  if (!action || decision.fingerprint !== issue.fingerprint) return null;
  const selection = action.selection;
  if (!selection) return decision.keepPath === void 0 ? action : null;
  if (!decision.keepPath || !selection.candidatePaths.includes(decision.keepPath)) {
    return null;
  }
  const targetPaths = selection.candidatePaths.filter(
    (path) => path !== decision.keepPath
  );
  return {
    ...action,
    description: `Keep "${decision.keepPath}" and move ${targetPaths.length} duplicate(s) to trash`,
    targetPaths
  };
}
function getFreshFixAction(requestedIssue, freshIssue, decision) {
  const requested = requestedIssue.fixAction;
  const fresh = freshIssue == null ? void 0 : freshIssue.fixAction;
  if (decision.fingerprint !== requestedIssue.fingerprint || (freshIssue == null ? void 0 : freshIssue.fingerprint) !== requestedIssue.fingerprint || !requested || !fresh) {
    return null;
  }
  if (requested.selection || fresh.selection) {
    if (!requested.selection || !fresh.selection || requested.kind !== fresh.kind || requested.label !== fresh.label || !samePaths(
      requested.selection.candidatePaths,
      fresh.selection.candidatePaths
    )) {
      return null;
    }
    return resolveDecisionAction(freshIssue, decision);
  }
  return fixActionsMatch(requested, fresh) ? fresh : null;
}
function samePaths(left, right) {
  const sortedLeft = left.slice().sort();
  const sortedRight = right.slice().sort();
  return sortedLeft.length === sortedRight.length && sortedRight.every((path, index) => path === sortedLeft[index]);
}
function fixActionsMatch(left, right) {
  return left.kind === right.kind && left.label === right.label && left.description === right.description && left.linkText === right.linkText && left.targetPaths.length === right.targetPaths.length && left.targetPaths.every(
    (path, index) => path === right.targetPaths[index]
  );
}

// src/fix/confirm-modal.ts
function describeFixActions(actions) {
  const modifiedNotes = new Set(
    actions.filter((action) => action.kind === "remove-link-text").flatMap((action) => action.targetPaths)
  );
  const trashedFiles = new Set(
    actions.filter((action) => action.kind === "trash-file").flatMap((action) => action.targetPaths)
  );
  const parts = [];
  if (modifiedNotes.size > 0) {
    parts.push(`modify ${modifiedNotes.size} ${pluralize("note", modifiedNotes.size)}`);
  }
  if (trashedFiles.size > 0) {
    parts.push(`move ${trashedFiles.size} ${pluralize("file", trashedFiles.size)} to trash`);
  }
  const description = parts.join(" and ");
  return description.length > 0 ? description.charAt(0).toUpperCase() + description.slice(1) : "Apply selected fixes";
}
function summarizeFixActions(actions) {
  var _a, _b;
  const isBatch = actions.length > 1;
  const impact = describeFixActions(actions);
  return {
    title: isBatch ? `Confirm batch fix (${actions.length} actions)` : "Confirm fix",
    description: isBatch ? `This will ${impact.charAt(0).toLowerCase()}${impact.slice(1)}.` : (_b = (_a = actions[0]) == null ? void 0 : _a.description) != null ? _b : "No fix action selected.",
    paths: [...new Set(actions.flatMap((action) => action.targetPaths))]
  };
}
function pluralize(noun, count) {
  return count === 1 ? noun : `${noun}s`;
}
function createSingleUseResolver(resolve) {
  let settled = false;
  return (value) => {
    if (settled) return false;
    settled = true;
    resolve(value);
    return true;
  };
}
function showConfirmModal(app, issues, mode) {
  return new Promise((resolve) => {
    new ConfirmFixModal(app, issues, mode, resolve).open();
  });
}
var ConfirmFixModal = class extends import_obsidian2.Modal {
  constructor(app, issues, mode, resolve) {
    super(app);
    this.selectedKeeps = /* @__PURE__ */ new Map();
    this.issues = issues;
    this.mode = mode;
    this.settle = createSingleUseResolver(resolve);
  }
  onOpen() {
    this.contentEl.addClass("vi-confirm-modal");
    this.renderContent();
  }
  onClose() {
    this.contentEl.empty();
    this.settle(null);
  }
  finish(result) {
    if (this.settle(result)) this.close();
  }
  renderContent() {
    var _a;
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("vi-confirm-modal");
    const state = buildFixDecisionState(
      this.issues,
      this.mode,
      this.selectedKeeps
    );
    const decisionsByFingerprint = new Map(
      state.decisions.map((decision) => [decision.fingerprint, decision])
    );
    const actions = this.issues.flatMap((issue) => {
      const decision = decisionsByFingerprint.get(issue.fingerprint);
      if (!decision) return [];
      const action = resolveDecisionAction(issue, decision);
      return action ? [action] : [];
    });
    const summary = summarizeFixActions(actions);
    contentEl.createEl("h3", {
      text: this.issues.length > 1 ? `Confirm batch fix (${this.issues.length} actions)` : "Confirm fix"
    });
    contentEl.createEl("p", {
      text: state.complete ? summary.description : "Choose one file to keep in every duplicate group."
    });
    if (this.mode === "always-ask") {
      for (const issue of this.issues) {
        const selection = (_a = issue.fixAction) == null ? void 0 : _a.selection;
        if (!selection) continue;
        const group = contentEl.createDiv({ cls: "vi-keep-group" });
        group.createDiv({
          cls: "vi-keep-group-title",
          text: "Choose one file to keep"
        });
        for (const path of selection.candidatePaths) {
          const option = group.createEl("label", { cls: "vi-keep-option" });
          const radio = option.createEl("input", { type: "radio" });
          radio.name = `keep-${issue.fingerprint}`;
          radio.checked = this.selectedKeeps.get(issue.fingerprint) === path;
          radio.addEventListener("change", () => {
            this.selectedKeeps.set(issue.fingerprint, path);
            this.renderContent();
          });
          option.createSpan({ cls: "vi-keep-option-path", text: path });
        }
      }
    }
    if (this.issues.length > 1 || actions.length > 1) {
      const list = contentEl.createDiv({ cls: "vi-file-list" });
      for (const path of summary.paths) {
        list.createDiv({ cls: "vi-file-list-item", text: path });
      }
    }
    const btnRow = contentEl.createDiv({ cls: "vi-confirm-buttons" });
    btnRow.createEl("button", { text: "Cancel" }).addEventListener("click", () => this.finish(null));
    const confirmBtn = btnRow.createEl("button", {
      cls: "vi-confirm-destructive",
      text: "Confirm"
    });
    confirmBtn.disabled = !state.complete;
    confirmBtn.addEventListener("click", () => {
      if (state.complete) this.finish(state.decisions);
    });
  }
};

// src/report/exclude-folder-modal.ts
var import_obsidian3 = require("obsidian");
function buildFolderExclusionRequest(issue, visibleIssues) {
  var _a;
  const path = (_a = issue.primaryPath) != null ? _a : issue.relatedPaths[0];
  if (!path) return null;
  const folder = getParentFolder(path);
  if (!folder) return null;
  const affectedCount = visibleIssues.filter((candidate) => {
    var _a2;
    if (candidate.scannerId !== issue.scannerId) return false;
    const candidatePath = (_a2 = candidate.primaryPath) != null ? _a2 : candidate.relatedPaths[0];
    return candidatePath ? isInFolder(candidatePath, folder) : false;
  }).length;
  return { scannerId: issue.scannerId, folder, affectedCount };
}
function showFolderExclusionModal(app, request) {
  return new Promise((resolve) => {
    new FolderExclusionModal(app, request, resolve).open();
  });
}
var FolderExclusionModal = class extends import_obsidian3.Modal {
  constructor(app, request, resolve) {
    super(app);
    this.request = request;
    this.settle = createSingleUseResolver(resolve);
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("vi-confirm-modal");
    contentEl.createEl("h3", { text: "Exclude parent folder" });
    contentEl.createEl("p", {
      text: "Future scans will skip this folder for the selected scanner."
    });
    this.renderDetail("Scanner", SCANNER_LABELS[this.request.scannerId]);
    this.renderDetail("Folder", this.request.folder);
    this.renderDetail("Affected findings", String(this.request.affectedCount));
    const buttons = contentEl.createDiv({ cls: "vi-confirm-buttons" });
    buttons.createEl("button", {
      text: "Cancel",
      attr: { type: "button" }
    }).addEventListener("click", () => this.finish(false));
    buttons.createEl("button", {
      text: "Exclude folder",
      attr: { type: "button" }
    }).addEventListener("click", () => this.finish(true));
  }
  onClose() {
    this.contentEl.empty();
    this.settle(false);
  }
  renderDetail(label, value) {
    const row = this.contentEl.createDiv({ cls: "vi-issue-target" });
    row.createSpan({ cls: "vi-issue-target-label", text: label });
    row.createSpan({ cls: "vi-issue-target-value", text: value });
  }
  finish(result) {
    if (this.settle(result)) this.close();
  }
};

// src/report/InspectorView.ts
var VIEW_TYPE_INSPECTOR = "vault-inspector";
function getLocationTargets(issue) {
  const url = issue.evidence.url;
  if (typeof url === "string") return [url];
  const link = issue.evidence.link;
  if (typeof link === "string") return [link];
  const target = issue.evidence.target;
  if (typeof target === "string") return [target];
  const property = issue.evidence.property;
  if (typeof property === "string") return [property];
  const tag = issue.evidence.tag;
  if (typeof tag === "string") return [`#${tag}`, tag];
  return [];
}
function findFirstTextPosition(content, targets) {
  for (const target of targets) {
    const position = findTextPosition(content, target);
    if (position) return position;
  }
  return null;
}
function findTextPosition(content, target) {
  const index = content.indexOf(target);
  if (index === -1) return null;
  const before = content.slice(0, index);
  const lines = before.split(/\n/);
  return {
    line: lines.length - 1,
    ch: lines[lines.length - 1].length
  };
}
var InspectorView = class extends import_obsidian4.ItemView {
  constructor(leaf) {
    super(leaf);
    this.model = {
      result: null,
      comparison: {
        available: false,
        reason: "first-scan",
        statuses: /* @__PURE__ */ new Map(),
        resolvedIssues: []
      },
      isScanning: false,
      scanProgress: null,
      scanStartedAt: null,
      filterScanner: null,
      filterSeverity: null,
      filterStatus: null,
      filterClassification: null,
      enableFixActions: true,
      selectionMode: false,
      selectedFingerprints: /* @__PURE__ */ new Set(),
      ignoredExpanded: false,
      resolvedExpanded: false,
      ignoredSelectionMode: false,
      ignoredSelectedFingerprints: /* @__PURE__ */ new Set(),
      operationOutcomes: []
    };
    this.onIgnoreAllIssues = null;
    this.onRestoreIssues = null;
    this.onFixAllIssues = null;
    this.onRevealIssue = null;
    this.onRunScan = null;
    this.onIgnoreIssue = null;
    this.onExcludeFolder = null;
    this.onOpenScannerSettings = null;
    this.backToTopHandler = null;
    this.scanTimer = null;
  }
  getViewType() {
    return VIEW_TYPE_INSPECTOR;
  }
  getDisplayText() {
    return "Vault inspector";
  }
  getIcon() {
    return "shield-check";
  }
  async onOpen() {
    await Promise.resolve();
    const container = this.containerEl.children[1];
    container.empty();
    container.classList.add("vault-inspector");
    this.render();
  }
  async onClose() {
    await Promise.resolve();
    if (this.backToTopHandler) {
      const container = this.containerEl.children[1];
      container.removeEventListener("scroll", this.backToTopHandler);
      this.backToTopHandler = null;
    }
    this.stopScanTimer();
    this.onIgnoreAllIssues = null;
    this.onRestoreIssues = null;
    this.onFixAllIssues = null;
    this.onRevealIssue = null;
    this.onRunScan = null;
    this.onIgnoreIssue = null;
    this.onExcludeFolder = null;
    this.onOpenScannerSettings = null;
  }
  setScanning(scanning) {
    this.model.isScanning = scanning;
    if (scanning) {
      this.model.scanStartedAt = Date.now();
      this.model.scanProgress = null;
      this.startScanTimer();
    } else {
      this.model.scanProgress = null;
      this.model.scanStartedAt = null;
      this.stopScanTimer();
    }
    this.render();
  }
  setScanProgress(progress) {
    this.model.scanProgress = progress;
    this.render();
  }
  setResult(result, comparison) {
    this.model.result = result;
    this.model.comparison = comparison;
    if (this.model.filterStatus && (!comparison.available || !result.issues.some((issue) => comparison.statuses.get(issue.fingerprint) === this.model.filterStatus))) {
      this.model.filterStatus = null;
    }
    if (this.model.filterClassification && !result.issues.some(
      (issue) => issue.classification === this.model.filterClassification
    )) {
      this.model.filterClassification = null;
    }
    this.model.isScanning = false;
    this.model.scanProgress = null;
    this.model.scanStartedAt = null;
    this.stopScanTimer();
    this.model.selectionMode = false;
    this.model.selectedFingerprints = /* @__PURE__ */ new Set();
    this.model.ignoredSelectionMode = false;
    this.model.ignoredSelectedFingerprints = /* @__PURE__ */ new Set();
    this.model.resolvedExpanded = false;
    this.render();
  }
  setEnableFixActions(enabled) {
    this.model.enableFixActions = enabled;
  }
  setOperationOutcomes(outcomes) {
    this.model.operationOutcomes = outcomes.map((outcome) => ({
      ...outcome,
      affectedPaths: [...outcome.affectedPaths]
    }));
    this.render();
  }
  setCallbacks(callbacks) {
    this.onIgnoreAllIssues = callbacks.onIgnoreAllIssues;
    this.onRestoreIssues = callbacks.onRestoreIssues;
    this.onFixAllIssues = callbacks.onFixAllIssues;
    this.onRevealIssue = callbacks.onRevealIssue;
    this.onRunScan = callbacks.onRunScan;
    this.onIgnoreIssue = callbacks.onIgnoreIssue;
    this.onExcludeFolder = callbacks.onExcludeFolder;
    this.onOpenScannerSettings = callbacks.onOpenScannerSettings;
  }
  hasResult() {
    return this.model.result !== null;
  }
  getResult() {
    return this.model.result;
  }
  // ─── Render ──────────────────────────────────────────────
  render() {
    const container = this.containerEl.children[1];
    if (this.backToTopHandler) {
      container.removeEventListener("scroll", this.backToTopHandler);
      this.backToTopHandler = null;
    }
    container.empty();
    if (this.model.isScanning) {
      this.renderProgress(container);
      return;
    }
    if (!this.model.result) {
      const empty = container.createDiv({ cls: "vi-empty" });
      empty.createEl("p", { text: "No scan results yet." });
      const btn = empty.createEl("button", { cls: "vi-empty-btn", text: "Run scan now" });
      btn.addEventListener("click", () => {
        if (this.onRunScan) this.onRunScan();
      });
      empty.createEl("p", {
        cls: "vi-empty-hint",
        text: 'You can also click the shield icon in the left ribbon, or run "vault inspector: Run scan" from the command palette.'
      });
      return;
    }
    const filterView = this.getIssueFilterView();
    this.renderToolbar(container, filterView);
    renderSummary(container, this.model.result, {
      comparison: this.model.comparison,
      onFilterStatus: (status) => {
        this.model.filterStatus = this.model.filterStatus === status ? null : status;
        this.render();
      }
    });
    renderOperationOutcomes(
      container,
      this.model.operationOutcomes,
      () => this.setOperationOutcomes([])
    );
    if (this.model.selectionMode) {
      this.renderMainActionBar(container);
    }
    const issuesContainer = container.createDiv({ cls: "vi-issues" });
    renderIssueList(issuesContainer, {
      issues: filterView.visibleIssues,
      scannersRun: this.model.result.scannersRun,
      selectionMode: this.model.selectionMode,
      selectedFingerprints: this.model.selectedFingerprints,
      statuses: this.model.comparison.statuses,
      onOpenIssue: (issue) => {
        void this.handleOpenIssue(issue);
      },
      onToggleSelect: (issue) => this.handleToggleSelect(issue),
      onIgnoreIssue: (issue) => {
        void this.handleIgnoreIssue(issue);
      },
      onExcludeFolder: (issue) => {
        void this.handleExcludeFolder(issue);
      },
      onOpenScannerSettings: (scannerId) => {
        var _a;
        (_a = this.onOpenScannerSettings) == null ? void 0 : _a.call(this, scannerId);
      }
    });
    this.renderResolvedSection(container);
    this.renderIgnoredSection(container);
    this.addBackToTop(container);
  }
  renderProgress(container) {
    var _a, _b, _c;
    const progress = this.model.scanProgress;
    const startedAt = (_a = this.model.scanStartedAt) != null ? _a : Date.now();
    const elapsedMs = Date.now() - startedAt;
    const scannerIndex = (_b = progress == null ? void 0 : progress.scannerIndex) != null ? _b : 0;
    const scannerTotal = (_c = progress == null ? void 0 : progress.scannerTotal) != null ? _c : 0;
    const percent = scannerTotal > 0 ? Math.max(0, Math.min(100, Math.round(scannerIndex / scannerTotal * 100))) : 0;
    const panel = container.createDiv({ cls: "vi-progress-panel" });
    panel.createEl("h2", { text: "Scanning vault" });
    const bar = panel.createDiv({ cls: "vi-progress-bar", attr: { "aria-label": "Scan progress" } });
    bar.createDiv({ cls: "vi-progress-bar-fill", attr: { style: `width: ${percent}%` } });
    panel.createDiv({
      cls: "vi-progress-meta",
      text: scannerTotal > 0 ? `${scannerIndex} / ${scannerTotal} scanners` : "Preparing scan..."
    });
    const current = panel.createDiv({ cls: "vi-progress-current" });
    const scannerLabel = progress ? SCANNER_LABELS[progress.scannerId] : "Preparing scan";
    current.createDiv({ cls: "vi-progress-label", text: "Current" });
    current.createDiv({ cls: "vi-progress-value", text: scannerLabel });
    const detailText = this.formatProgressDetail(progress);
    if (detailText) {
      const detail = panel.createDiv({ cls: "vi-progress-detail" });
      detail.createSpan({ text: detailText });
    }
    panel.createDiv({
      cls: "vi-progress-elapsed",
      text: `Elapsed: ${formatDuration(elapsedMs)}`
    });
  }
  formatProgressDetail(progress) {
    if (!progress) return "";
    if (progress.type === "scanner-skipped") {
      return progress.message ? `Skipped: ${progress.message}` : "Skipped";
    }
    if (progress.type === "scanner-complete") return "Completed";
    const parts = [];
    if (progress.phase) {
      if (typeof progress.current === "number" && typeof progress.total === "number") {
        parts.push(`${progress.phase}: ${progress.current} / ${progress.total}`);
      } else {
        parts.push(progress.phase);
      }
    } else if (progress.type === "scanner-start") {
      parts.push("Scanning...");
    }
    if (progress.message) parts.push(progress.message);
    return parts.join(" \xB7 ");
  }
  startScanTimer() {
    if (this.scanTimer) return;
    this.scanTimer = window.setInterval(() => {
      if (this.model.isScanning) this.render();
    }, 1e3);
  }
  stopScanTimer() {
    if (!this.scanTimer) return;
    window.clearInterval(this.scanTimer);
    this.scanTimer = null;
  }
  // ─── Toolbar ─────────────────────────────────────────────
  renderToolbar(container, filterView) {
    var _a, _b;
    const toolbar = container.createDiv({ cls: "vi-toolbar" });
    this.renderScannerFilter(toolbar, filterView);
    this.renderSeverityFilter(toolbar, filterView);
    if (this.model.comparison.available) {
      this.renderLifecycleFilter(toolbar, filterView);
    }
    if (((_b = (_a = this.model.result) == null ? void 0 : _a.issues.length) != null ? _b : 0) > 0) {
      this.renderClassificationFilter(toolbar, filterView);
    }
    if (filterView.visibleIssues.length > 0) {
      const selectBtn = toolbar.createEl("button", {
        cls: `vi-filter-btn vi-select-btn ${this.model.selectionMode ? "vi-active" : ""}`,
        text: this.model.selectionMode ? "Done" : "Select"
      });
      (0, import_obsidian4.setTooltip)(selectBtn, this.model.selectionMode ? "Exit selection mode" : "Enter selection mode");
      selectBtn.addEventListener("click", () => {
        this.model.selectionMode = !this.model.selectionMode;
        if (!this.model.selectionMode) this.model.selectedFingerprints = /* @__PURE__ */ new Set();
        this.render();
      });
    }
  }
  renderScannerFilter(toolbar, filterView) {
    var _a;
    if (!this.model.result) return;
    const group = toolbar.createDiv({ cls: "vi-filter-group" });
    group.createEl("button", {
      cls: `vi-filter-btn ${this.model.filterScanner === null ? "vi-active" : ""}`,
      text: "All"
    }).addEventListener("click", () => {
      this.model.filterScanner = null;
      this.render();
    });
    for (const scannerId of this.model.result.scannersRun) {
      const count = (_a = filterView.scannerCounts.get(scannerId)) != null ? _a : 0;
      group.createEl("button", {
        cls: `vi-filter-btn ${this.model.filterScanner === scannerId ? "vi-active" : ""}`,
        text: `${SCANNER_LABELS[scannerId]} (${count})`
      }).addEventListener("click", () => {
        this.model.filterScanner = this.model.filterScanner === scannerId ? null : scannerId;
        this.render();
      });
    }
  }
  renderSeverityFilter(toolbar, filterView) {
    if (!this.model.result) return;
    const group = toolbar.createDiv({ cls: "vi-filter-group" });
    for (const { severity, count } of filterView.severityFacets) {
      group.createEl("button", {
        cls: `vi-filter-btn vi-severity-${severity} ${this.model.filterSeverity === severity ? "vi-active" : ""}`,
        text: `${severity} (${count})`
      }).addEventListener("click", () => {
        this.model.filterSeverity = this.model.filterSeverity === severity ? null : severity;
        this.render();
      });
    }
  }
  renderLifecycleFilter(toolbar, filterView) {
    const group = toolbar.createDiv({ cls: "vi-filter-group vi-lifecycle-filter" });
    for (const { status, count } of filterView.statusFacets) {
      group.createEl("button", {
        cls: `vi-filter-btn ${this.model.filterStatus === status ? "vi-active" : ""}`,
        text: `${status} (${count})`
      }).addEventListener("click", () => {
        this.model.filterStatus = this.model.filterStatus === status ? null : status;
        this.render();
      });
    }
  }
  renderClassificationFilter(toolbar, filterView) {
    const group = toolbar.createDiv({ cls: "vi-filter-group vi-classification-filter" });
    for (const { classification, count } of filterView.classificationFacets) {
      group.createEl("button", {
        cls: `vi-filter-btn ${this.model.filterClassification === classification ? "vi-active" : ""}`,
        text: `${classification} (${count})`
      }).addEventListener("click", () => {
        this.model.filterClassification = this.model.filterClassification === classification ? null : classification;
        this.render();
      });
    }
  }
  // ─── Main Action Bar ─────────────────────────────────────
  renderMainActionBar(container) {
    if (!this.model.result) return;
    const visibleIssues = this.getVisibleIssues();
    const selectedIssues = visibleIssues.filter((i) => this.model.selectedFingerprints.has(i.fingerprint));
    const selectedFixable = selectedIssues.filter((i) => i.fixAction);
    const bar = container.createDiv({ cls: "vi-action-bar" });
    const left = bar.createDiv({ cls: "vi-action-bar-left" });
    const right = bar.createDiv({ cls: "vi-action-bar-right" });
    const allSelected = visibleIssues.length > 0 && visibleIssues.every((i) => this.model.selectedFingerprints.has(i.fingerprint));
    const toggleAll = left.createEl("input", { cls: "vi-issue-checkbox", type: "checkbox" });
    toggleAll.checked = allSelected;
    (0, import_obsidian4.setTooltip)(toggleAll, allSelected ? "Deselect all" : "Select all");
    toggleAll.addEventListener("click", () => {
      if (allSelected) {
        this.model.selectedFingerprints = /* @__PURE__ */ new Set();
      } else {
        for (const issue of visibleIssues) this.model.selectedFingerprints.add(issue.fingerprint);
      }
      this.render();
    });
    if (this.model.enableFixActions && selectedFixable.length > 0) {
      const fixBtn = right.createEl("button", { cls: "vi-action-btn vi-action-delete" });
      const actionKinds = new Set(selectedFixable.map((issue) => issue.fixAction.kind));
      (0, import_obsidian5.setIcon)(
        fixBtn,
        actionKinds.size > 1 ? "wrench" : actionKinds.has("remove-link-text") ? "pencil" : "trash-2"
      );
      fixBtn.createSpan({ text: `(${selectedFixable.length})` });
      (0, import_obsidian4.setTooltip)(
        fixBtn,
        describeFixActions(selectedFixable.map((issue) => issue.fixAction))
      );
      fixBtn.addEventListener("click", () => {
        void this.handleBatchAction(
          this.onFixAllIssues,
          selectedFixable,
          "Fixing issues"
        );
      });
    }
    if (selectedIssues.length > 0) {
      const ignoreBtn = right.createEl("button", { cls: "vi-action-btn vi-action-ignore" });
      (0, import_obsidian5.setIcon)(ignoreBtn, "eye-off");
      ignoreBtn.createSpan({ text: `(${selectedIssues.length})` });
      (0, import_obsidian4.setTooltip)(ignoreBtn, "Hide selected issues from future scans");
      ignoreBtn.addEventListener("click", () => {
        void this.handleBatchAction(
          this.onIgnoreAllIssues,
          selectedIssues,
          "Ignoring issues"
        );
      });
    }
    const cancelBtn = right.createEl("button", { cls: "vi-action-btn" });
    (0, import_obsidian5.setIcon)(cancelBtn, "x");
    (0, import_obsidian4.setTooltip)(cancelBtn, "Exit selection mode");
    cancelBtn.addEventListener("click", () => {
      this.model.selectionMode = false;
      this.model.selectedFingerprints = /* @__PURE__ */ new Set();
      this.render();
    });
  }
  // ─── Resolved and ignored sections ───────────────────────
  renderResolvedSection(container) {
    const comparison = this.model.comparison;
    if (!comparison.available || comparison.resolvedIssues.length === 0) return;
    const section = container.createDiv({ cls: "vi-resolved-section" });
    const header = section.createEl("button", {
      cls: "vi-resolved-header",
      text: `Resolved items (${comparison.resolvedIssues.length})`,
      attr: {
        type: "button",
        "aria-expanded": String(this.model.resolvedExpanded)
      }
    });
    const chevron = header.createSpan({ cls: "vi-resolved-chevron" });
    (0, import_obsidian5.setIcon)(chevron, this.model.resolvedExpanded ? "chevron-down" : "chevron-right");
    header.addEventListener("click", () => {
      this.model.resolvedExpanded = !this.model.resolvedExpanded;
      this.render();
    });
    if (!this.model.resolvedExpanded) return;
    const body = section.createDiv({ cls: "vi-resolved-body" });
    renderResolvedChanges(body, comparison.resolvedIssues);
  }
  renderIgnoredSection(container) {
    if (!this.model.result) return;
    const ignoredIssues = this.model.result.ignoredIssues;
    if (ignoredIssues.length === 0) return;
    const section = container.createDiv({ cls: "vi-ignored-section" });
    const header = section.createDiv({ cls: "vi-ignored-header" });
    const headerLeft = header.createDiv({ cls: "vi-ignored-header-left" });
    const chevron = headerLeft.createSpan({ cls: "vi-ignored-chevron" });
    (0, import_obsidian5.setIcon)(chevron, this.model.ignoredExpanded ? "chevron-down" : "chevron-right");
    headerLeft.createSpan({ text: `Ignored items (${ignoredIssues.length})` });
    headerLeft.addEventListener("click", () => {
      this.model.ignoredExpanded = !this.model.ignoredExpanded;
      if (!this.model.ignoredExpanded) {
        this.model.ignoredSelectionMode = false;
        this.model.ignoredSelectedFingerprints = /* @__PURE__ */ new Set();
      }
      this.render();
    });
    if (this.model.ignoredExpanded) {
      const selectBtn = header.createEl("button", {
        cls: `vi-filter-btn vi-select-btn ${this.model.ignoredSelectionMode ? "vi-active" : ""}`,
        text: this.model.ignoredSelectionMode ? "Done" : "Select"
      });
      (0, import_obsidian4.setTooltip)(selectBtn, this.model.ignoredSelectionMode ? "Exit selection mode" : "Select to restore");
      selectBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.model.ignoredSelectionMode = !this.model.ignoredSelectionMode;
        if (!this.model.ignoredSelectionMode) this.model.ignoredSelectedFingerprints = /* @__PURE__ */ new Set();
        this.render();
      });
    }
    if (!this.model.ignoredExpanded) return;
    const body = section.createDiv({ cls: "vi-ignored-body" });
    if (this.model.ignoredSelectionMode) {
      this.renderIgnoredActionBar(body, ignoredIssues);
    }
    const listContainer = body.createDiv({ cls: "vi-ignored-list" });
    renderIssueList(listContainer, {
      issues: ignoredIssues,
      scannersRun: this.model.result.scannersRun,
      selectionMode: this.model.ignoredSelectionMode,
      selectedFingerprints: this.model.ignoredSelectedFingerprints,
      statuses: this.model.comparison.statuses,
      onOpenIssue: (issue) => {
        void this.handleOpenIssue(issue);
      },
      onToggleSelect: (issue) => this.handleIgnoredToggleSelect(issue)
    });
  }
  renderIgnoredActionBar(container, ignoredIssues) {
    const selectedIssues = ignoredIssues.filter((i) => this.model.ignoredSelectedFingerprints.has(i.fingerprint));
    const bar = container.createDiv({ cls: "vi-action-bar" });
    const left = bar.createDiv({ cls: "vi-action-bar-left" });
    const right = bar.createDiv({ cls: "vi-action-bar-right" });
    const allSelected = ignoredIssues.length > 0 && ignoredIssues.every((i) => this.model.ignoredSelectedFingerprints.has(i.fingerprint));
    const toggleAll = left.createEl("input", { cls: "vi-issue-checkbox", type: "checkbox" });
    toggleAll.checked = allSelected;
    (0, import_obsidian4.setTooltip)(toggleAll, allSelected ? "Deselect all" : "Select all");
    toggleAll.addEventListener("click", () => {
      if (allSelected) {
        this.model.ignoredSelectedFingerprints = /* @__PURE__ */ new Set();
      } else {
        for (const issue of ignoredIssues) this.model.ignoredSelectedFingerprints.add(issue.fingerprint);
      }
      this.render();
    });
    if (selectedIssues.length > 0) {
      const restoreBtn = right.createEl("button", { cls: "vi-action-btn" });
      (0, import_obsidian5.setIcon)(restoreBtn, "eye");
      restoreBtn.createSpan({ text: `(${selectedIssues.length})` });
      (0, import_obsidian4.setTooltip)(restoreBtn, "Stop ignoring selected issues");
      restoreBtn.addEventListener("click", () => {
        void this.handleBatchAction(
          this.onRestoreIssues,
          selectedIssues,
          "Restoring issues"
        );
      });
    }
    const cancelBtn = right.createEl("button", { cls: "vi-action-btn" });
    (0, import_obsidian5.setIcon)(cancelBtn, "x");
    (0, import_obsidian4.setTooltip)(cancelBtn, "Exit selection mode");
    cancelBtn.addEventListener("click", () => {
      this.model.ignoredSelectionMode = false;
      this.model.ignoredSelectedFingerprints = /* @__PURE__ */ new Set();
      this.render();
    });
  }
  // ─── Helpers ─────────────────────────────────────────────
  addBackToTop(container) {
    const anchor = container.createDiv({ cls: "vi-back-to-top-anchor" });
    const btn = anchor.createEl("button", { cls: "vi-back-to-top" });
    (0, import_obsidian5.setIcon)(btn, "arrow-up");
    (0, import_obsidian4.setTooltip)(btn, "Back to top");
    btn.addEventListener("click", () => {
      container.scrollTo({ top: 0, behavior: "smooth" });
    });
    const updateVisibility = () => {
      btn.style.display = container.scrollTop > 200 ? "" : "none";
    };
    container.addEventListener("scroll", updateVisibility);
    this.backToTopHandler = updateVisibility;
    updateVisibility();
  }
  getVisibleIssues() {
    return this.getIssueFilterView().visibleIssues;
  }
  getIssueFilterView() {
    var _a, _b;
    return buildIssueFilterView((_b = (_a = this.model.result) == null ? void 0 : _a.issues) != null ? _b : [], {
      scanner: this.model.filterScanner,
      severity: this.model.filterSeverity,
      status: this.model.filterStatus,
      classification: this.model.filterClassification
    }, this.model.comparison.statuses);
  }
  async handleExcludeFolder(issue) {
    const request = buildFolderExclusionRequest(issue, this.getVisibleIssues());
    if (!request) return;
    try {
      if (!await showFolderExclusionModal(this.app, request)) return;
      if (this.onExcludeFolder) await this.onExcludeFolder(request);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new import_obsidian4.Notice(`Folder exclusion failed: ${message}`);
    }
  }
  async handleIgnoreIssue(issue) {
    if (!this.onIgnoreIssue) return;
    try {
      await this.onIgnoreIssue(issue);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new import_obsidian4.Notice(`Ignoring issue failed: ${message}`);
    }
  }
  async handleBatchAction(callback, issues, label) {
    if (!callback) return;
    try {
      await callback(issues);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new import_obsidian4.Notice(`${label} failed: ${message}`);
    }
  }
  async handleOpenIssue(issue) {
    if (this.onRevealIssue) {
      void this.onRevealIssue(issue);
      return;
    }
    await this.revealIssue(issue);
  }
  async revealIssue(issue) {
    var _a;
    const path = (_a = issue.primaryPath) != null ? _a : issue.relatedPaths[0];
    if (!path) return;
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof import_obsidian4.TFile)) return;
    const leaf = this.app.workspace.getLeaf(false);
    await leaf.openFile(file, { active: true });
    const targets = getLocationTargets(issue);
    if (targets.length === 0) return;
    const content = await this.app.vault.cachedRead(file);
    const position = findFirstTextPosition(content, targets);
    if (!position) return;
    const view = this.app.workspace.getActiveViewOfType(import_obsidian4.MarkdownView);
    const editor = view == null ? void 0 : view.editor;
    if (!editor) return;
    editor.setCursor(position);
    editor.scrollIntoView({ from: position, to: position }, true);
    editor.focus();
  }
  handleToggleSelect(issue) {
    if (this.model.selectedFingerprints.has(issue.fingerprint)) {
      this.model.selectedFingerprints.delete(issue.fingerprint);
    } else {
      this.model.selectedFingerprints.add(issue.fingerprint);
    }
    this.render();
  }
  handleIgnoredToggleSelect(issue) {
    if (this.model.ignoredSelectedFingerprints.has(issue.fingerprint)) {
      this.model.ignoredSelectedFingerprints.delete(issue.fingerprint);
    } else {
      this.model.ignoredSelectedFingerprints.add(issue.fingerprint);
    }
    this.render();
  }
};

// src/scanner/ScanRunner.ts
function getEffectiveIgnoredFolders(globalFolders, scannerFolders) {
  return [.../* @__PURE__ */ new Set([...globalFolders, ...scannerFolders])];
}
var ScanRunner = class {
  constructor(requestUrl2, timers) {
    this.requestUrl = requestUrl2;
    this.timers = timers;
    this.scanners = [];
  }
  register(scanner) {
    this.scanners.push(scanner);
  }
  async run(app, settings, options = {}) {
    var _a, _b, _c;
    const startedAt = Date.now();
    const markdownFiles = app.vault.getMarkdownFiles();
    const allFiles = app.vault.getFiles();
    const filePathIndex = new Set(allFiles.map((f) => f.path));
    const ctx = {
      app,
      metadataCache: app.metadataCache,
      vault: app.vault,
      requestUrl: this.requestUrl,
      setTimeout: (_a = this.timers) == null ? void 0 : _a.setTimeout,
      clearTimeout: (_b = this.timers) == null ? void 0 : _b.clearTimeout,
      markdownFiles,
      allFiles,
      filePathIndex,
      enabledScanners: new Set(
        Object.entries(settings.enabledScanners).filter(([, enabled]) => enabled).map(([id]) => id)
      ),
      ignoredFingerprints: new Set(settings.ignoredIssueFingerprints),
      largeMarkdownBytes: settings.largeMarkdownBytes,
      largeAttachmentBytes: settings.largeAttachmentBytes,
      ignoredLargeMarkdownFrontmatterKeys: settings.ignoredLargeMarkdownFrontmatterKeys,
      ignoredLargeMarkdownPathPatterns: settings.ignoredLargeMarkdownPathPatterns,
      duplicateHashMaxBytes: settings.duplicateHashMaxBytes,
      lowUsageTagThreshold: settings.lowUsageTagThreshold,
      watchedTags: settings.watchedTags,
      ignoredFolders: settings.ignoredFolders,
      ignoreUnresolvedNoteLinks: settings.ignoreUnresolvedNoteLinks,
      ignoredProperties: settings.ignoredProperties,
      emptyNoteWordThreshold: settings.emptyNoteWordThreshold
    };
    const scannersRun = [];
    const issues = [];
    const ignoredIssues = [];
    for (let index = 0; index < this.scanners.length; index++) {
      const scanner = this.scanners[index];
      const scannerIndex = index + 1;
      const scannerTotal = this.scanners.length;
      const emitProgress = (type, message) => {
        var _a2;
        (_a2 = options.onProgress) == null ? void 0 : _a2.call(options, {
          type,
          scannerId: scanner.id,
          scannerIndex,
          scannerTotal,
          message,
          elapsedMs: Date.now() - startedAt
        });
      };
      if (!ctx.enabledScanners.has(scanner.id)) {
        emitProgress("scanner-skipped", "disabled");
        continue;
      }
      scannersRun.push(scanner.id);
      emitProgress("scanner-start");
      const scannerContext = {
        ...ctx,
        ignoredFolders: getEffectiveIgnoredFolders(
          settings.ignoredFolders,
          (_c = settings.ignoredFoldersByScanner[scanner.id]) != null ? _c : []
        )
      };
      const result = await scanner.scan(scannerContext, (progress) => {
        var _a2;
        (_a2 = options.onProgress) == null ? void 0 : _a2.call(options, {
          ...progress,
          scannerId: scanner.id,
          scannerIndex,
          scannerTotal,
          elapsedMs: Date.now() - startedAt
        });
      });
      for (const issue of result) {
        if (ctx.ignoredFingerprints.has(issue.fingerprint)) {
          ignoredIssues.push(issue);
        } else {
          issues.push(issue);
        }
      }
      emitProgress("scanner-complete");
    }
    return {
      startedAt,
      finishedAt: Date.now(),
      issues,
      ignoredIssues,
      filesScanned: allFiles.length,
      scannersRun
    };
  }
};

// src/scanner/finding-presentation.ts
function describeFinding(classification, why, nextStep, caveat) {
  return {
    classification,
    explanation: {
      why,
      ...caveat === void 0 ? {} : { caveat },
      nextStep
    }
  };
}

// src/scanner/issue-fingerprint.ts
function generateFingerprint(scannerId, primaryPath, evidence) {
  const stableEvidence = Object.keys(evidence).sort().map((k) => `${k}=${evidence[k]}`).join("&");
  const raw = `${scannerId}:${primaryPath != null ? primaryPath : ""}:${stableEvidence}`;
  return hashString(raw);
}
function hashString(str) {
  let h1 = 2166136261;
  let h2 = 16777619;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = (h1 << 5) - h1 + c | 0;
    h2 = (h2 << 5) - h2 + c | 0;
  }
  return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36);
}

// src/utils/vault-links.ts
var indexCache = /* @__PURE__ */ new WeakMap();
function getLinkTarget(linkText) {
  return normalizePath(linkText.split("|")[0].split("#")[0].trim());
}
function resolveVaultLinkTargets(ctx, linkText, sourcePath) {
  var _a, _b;
  const target = getLinkTarget(linkText);
  if (!target || hasUriScheme(target)) return [];
  const extension = getExtension(target);
  const relativeTarget = sourcePath && /^\.{1,2}\//.test(target) ? resolveRelativePath(sourcePath, target) : null;
  const sourceFolderTarget = sourcePath && !target.includes("/") ? resolveRelativePath(sourcePath, `./${target}`) : null;
  const candidateTargets = relativeTarget ? [relativeTarget] : sourceFolderTarget ? [sourceFolderTarget, target] : [target];
  const exactCandidates = candidateTargets.flatMap(
    (candidate) => extension ? [candidate] : [candidate, `${candidate}.md`]
  );
  for (const candidate of exactCandidates) {
    if (ctx.filePathIndex.has(candidate)) return [candidate];
  }
  if (target.includes("/")) return [];
  const indexes = getLinkIndexes(ctx);
  if (extension) {
    return ((_a = indexes.fileNameToPaths.get(target)) != null ? _a : []).slice(0, 1);
  }
  return ((_b = indexes.markdownBaseToPaths.get(target)) != null ? _b : []).slice(0, 1);
}
function hasUriScheme(text) {
  return /^[a-z][a-z\d+.-]*:/i.test(text);
}
function resolveRelativePath(sourcePath, target) {
  const segments = normalizePath(sourcePath).split("/");
  segments.pop();
  for (const segment of normalizePath(target).split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      segments.pop();
    } else {
      segments.push(segment);
    }
  }
  return segments.join("/");
}
function getLinkIndexes(ctx) {
  var _a, _b;
  const cached = indexCache.get(ctx);
  if (cached) return cached;
  const fileNameToPaths = /* @__PURE__ */ new Map();
  for (const file of ctx.allFiles) {
    const normalizedPath = normalizePath(file.path);
    const fileName = normalizedPath.split("/").pop();
    if (!fileName) continue;
    const paths = (_a = fileNameToPaths.get(fileName)) != null ? _a : [];
    paths.push(file.path);
    fileNameToPaths.set(fileName, paths);
  }
  const markdownBaseToPaths = /* @__PURE__ */ new Map();
  for (const file of ctx.markdownFiles) {
    const baseName = getBasename(file.path);
    const paths = (_b = markdownBaseToPaths.get(baseName)) != null ? _b : [];
    paths.push(file.path);
    markdownBaseToPaths.set(baseName, paths);
  }
  for (const paths of fileNameToPaths.values()) paths.sort();
  for (const paths of markdownBaseToPaths.values()) paths.sort();
  const indexes = { fileNameToPaths, markdownBaseToPaths };
  indexCache.set(ctx, indexes);
  return indexes;
}

// src/scanner/scanners/broken-links.ts
var brokenLinksScanner = {
  id: "broken-links",
  scan(ctx) {
    var _a, _b, _c;
    const issues = [];
    const { markdownFiles, metadataCache } = ctx;
    for (const file of markdownFiles) {
      if (isIgnoredPath(file.path, ctx.ignoredFolders)) continue;
      const cache = metadataCache.getFileCache(file);
      if (!cache) continue;
      const meta = metadataCache;
      const linksForFile = (_a = meta.unresolvedLinks) == null ? void 0 : _a[file.path];
      const references = [
        ...((_b = cache.links) != null ? _b : []).map((reference) => ({
          reference,
          isEmbed: false
        })),
        ...((_c = cache.embeds) != null ? _c : []).map((reference) => ({
          reference,
          isEmbed: true
        }))
      ];
      const linkCandidates = /* @__PURE__ */ new Map();
      const addCandidate = (candidate) => {
        var _a2;
        const existing = linkCandidates.get(candidate.linkText);
        linkCandidates.set(candidate.linkText, {
          linkText: candidate.linkText,
          fixLinkText: (_a2 = existing == null ? void 0 : existing.fixLinkText) != null ? _a2 : candidate.fixLinkText,
          ignorableUnresolvedNote: existing ? existing.ignorableUnresolvedNote && candidate.ignorableUnresolvedNote : candidate.ignorableUnresolvedNote
        });
      };
      for (const unresolvedLink of Object.keys(linksForFile != null ? linksForFile : {})) {
        const matchingReferences = references.filter(
          ({ reference }) => reference.link === unresolvedLink
        );
        if (matchingReferences.length === 0) {
          addCandidate({
            linkText: unresolvedLink,
            ignorableUnresolvedNote: false
          });
          continue;
        }
        for (const reference of matchingReferences) {
          addCandidate(getLinkCandidate(reference));
        }
      }
      for (const reference of references) {
        if (reference.reference.link.includes("#")) {
          addCandidate(getLinkCandidate(reference));
        }
      }
      for (const candidate of linkCandidates.values()) {
        issues.push(...resolveLinkIssues(
          ctx,
          file.path,
          candidate.linkText,
          candidate.fixLinkText,
          candidate.ignorableUnresolvedNote
        ));
      }
    }
    return issues;
  }
};
function resolveLinkIssues(ctx, sourcePath, linkText, fixLinkText, ignorableUnresolvedNote) {
  var _a;
  const issues = [];
  const rawTarget = getLinkTarget(linkText);
  if (!rawTarget || hasUriScheme(rawTarget)) return issues;
  if (isAttachmentLink(rawTarget)) {
    if (!findResolvedPath(ctx, rawTarget, sourcePath)) {
      issues.push(
        makeIssue(
          sourcePath,
          linkText,
          fixLinkText,
          rawTarget,
          "error",
          `Attachment not found: ${rawTarget}`
        )
      );
    }
    return issues;
  }
  const linkDestination = linkText.split("|")[0];
  const headingPart = linkDestination.includes("#") ? linkDestination.split("#").slice(1).join("#") : null;
  const resolvedPath = findMarkdownPath(ctx, rawTarget, sourcePath);
  if (!resolvedPath) {
    if (ctx.ignoreUnresolvedNoteLinks && ignorableUnresolvedNote) {
      return issues;
    }
    issues.push(
      makeIssue(
        sourcePath,
        linkText,
        fixLinkText,
        rawTarget,
        "error",
        `Linked file not found: ${rawTarget}`
      )
    );
    return issues;
  }
  if (headingPart) {
    const headingCache = ctx.metadataCache.getFileCache(
      ctx.markdownFiles.find((file) => file.path === resolvedPath)
    );
    const headings = (_a = headingCache == null ? void 0 : headingCache.headings) != null ? _a : [];
    const headingSlug = slugifyHeading(headingPart);
    const found = headings.some(
      (heading) => slugifyHeading(heading.heading) === headingSlug
    );
    if (!found) {
      issues.push(
        makeIssue(
          sourcePath,
          linkText,
          fixLinkText,
          resolvedPath,
          "warning",
          `Heading "#${headingPart}" not found in ${resolvedPath}`
        )
      );
    }
  }
  return issues;
}
function getLinkCandidate({ reference, isEmbed }) {
  var _a;
  const original = (_a = reference.original) != null ? _a : "";
  const originalWikiLink = original.match(/^!?\[\[([\s\S]+)\]\]$/);
  if (originalWikiLink) {
    return {
      linkText: originalWikiLink[1],
      fixLinkText: originalWikiLink[1],
      ignorableUnresolvedNote: !isEmbed && original.startsWith("[[")
    };
  }
  return {
    linkText: reference.link,
    ignorableUnresolvedNote: false
  };
}
function isAttachmentLink(target) {
  var _a;
  const lastSegment = (_a = target.split("/").pop()) != null ? _a : "";
  const dotIndex = lastSegment.lastIndexOf(".");
  if (dotIndex === -1) return false;
  const ext = lastSegment.slice(dotIndex + 1).toLowerCase();
  return ext !== "md";
}
function findMarkdownPath(ctx, linkDestination, sourcePath) {
  const resolvedPath = findResolvedPath(ctx, linkDestination, sourcePath);
  return (resolvedPath == null ? void 0 : resolvedPath.endsWith(".md")) ? resolvedPath : null;
}
function findResolvedPath(ctx, linkDestination, sourcePath) {
  var _a, _b, _c;
  if (typeof ctx.metadataCache.getFirstLinkpathDest === "function") {
    return (_b = (_a = ctx.metadataCache.getFirstLinkpathDest(
      linkDestination,
      sourcePath
    )) == null ? void 0 : _a.path) != null ? _b : null;
  }
  return (_c = resolveVaultLinkTargets(
    ctx,
    linkDestination,
    sourcePath
  )[0]) != null ? _c : null;
}
function slugifyHeading(heading) {
  return heading.toLowerCase().trim().replace(/[^\p{L}\p{N}_\s-]/gu, "").replace(/\s+/g, "-");
}
function makeIssue(sourcePath, linkText, fixLinkText, targetPath, severity, message) {
  const issue = {
    scannerId: "broken-links",
    severity,
    title: "Broken link",
    message,
    primaryPath: sourcePath,
    relatedPaths: [targetPath],
    evidence: { link: linkText, target: targetPath },
    ...describeFinding(
      "confirmed",
      severity === "error" ? "The link target could not be resolved in the vault." : "The target note exists, but the referenced heading was not found.",
      severity === "error" ? "Correct the target or remove the link from the source note." : "Correct the heading reference or remove it from the source note."
    ),
    fingerprint: generateFingerprint("broken-links", sourcePath, {
      link: linkText,
      target: targetPath
    })
  };
  if (fixLinkText) {
    issue.fixAction = {
      kind: "remove-link-text",
      label: "Remove link",
      description: `Remove "[[${fixLinkText}]]" from "${sourcePath}"`,
      targetPaths: [sourcePath],
      linkText: fixLinkText
    };
  }
  return issue;
}

// src/utils/hash.ts
async function hashContent(content) {
  const hashBuffer = await crypto.subtle.digest("SHA-256", content);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// src/scanner/scanners/duplicate-files.ts
var duplicateFilesScanner = {
  id: "duplicate-files",
  async scan(ctx) {
    var _a, _b, _c;
    const issues = [];
    const files = ctx.allFiles.filter(
      (f) => f.stat.size > 0 && !isIgnoredPath(f.path, ctx.ignoredFolders)
    );
    const nameGroups = /* @__PURE__ */ new Map();
    for (const file of files) {
      const key = `${getBasename(file.path)}.${getExtension(file.path)}`;
      const group = (_a = nameGroups.get(key)) != null ? _a : [];
      group.push(file);
      nameGroups.set(key, group);
    }
    const sizeGroups = /* @__PURE__ */ new Map();
    for (const file of files) {
      const group = (_b = sizeGroups.get(file.stat.size)) != null ? _b : [];
      group.push(file);
      sizeGroups.set(file.stat.size, group);
    }
    const candidates = /* @__PURE__ */ new Set();
    for (const [, group] of nameGroups) {
      if (group.length >= 2) group.forEach((f) => candidates.add(f));
    }
    for (const [, group] of sizeGroups) {
      if (group.length >= 2) group.forEach((f) => candidates.add(f));
    }
    const hashGroups = /* @__PURE__ */ new Map();
    for (const file of candidates) {
      if (file.stat.size <= ctx.duplicateHashMaxBytes) {
        try {
          const content = await ctx.vault.readBinary(file);
          const hash = await hashContent(content);
          const group = (_c = hashGroups.get(hash)) != null ? _c : [];
          group.push(file.path);
          hashGroups.set(hash, group);
        } catch (e) {
          continue;
        }
      }
    }
    const hashReportedPaths = /* @__PURE__ */ new Set();
    for (const [, paths] of hashGroups) {
      if (paths.length < 2) continue;
      paths.forEach((p) => hashReportedPaths.add(p));
      const sorted = paths.slice().sort();
      const kept = sorted[0];
      const duplicates = sorted.slice(1);
      issues.push({
        scannerId: "duplicate-files",
        severity: "warning",
        title: "Duplicate files (hash-identical)",
        message: `${paths.length} files have identical content`,
        relatedPaths: paths,
        evidence: {
          count: paths.length,
          paths: paths.join(", ")
        },
        ...describeFinding(
          "confirmed",
          `SHA-256 content hashes match across ${paths.length} files.`,
          "Choose the file to keep before moving the remaining copies to trash.",
          "The files are byte-identical, but their locations can still serve different workflows."
        ),
        fingerprint: generateFingerprint("duplicate-files", void 0, {
          paths: sorted.join(",")
        }),
        fixAction: {
          kind: "trash-file",
          label: "Delete duplicates",
          description: `Keep "${kept}" and move ${duplicates.length} duplicate(s) to trash`,
          targetPaths: duplicates,
          selection: {
            kind: "keep-one",
            candidatePaths: sorted,
            automaticKeepPath: kept
          }
        }
      });
    }
    for (const [name, group] of nameGroups) {
      if (group.length < 2) continue;
      const unreached = group.filter((f) => !hashReportedPaths.has(f.path));
      if (unreached.length < 2) continue;
      const paths = unreached.map((f) => f.path);
      issues.push({
        scannerId: "duplicate-files",
        severity: "info",
        title: "Duplicate file candidates (same name)",
        message: `${paths.length} files share the name "${name}"`,
        relatedPaths: paths,
        evidence: {
          count: paths.length,
          paths: paths.join(", ")
        },
        ...describeFinding(
          "candidate",
          `${paths.length} files share the same filename.`,
          "Compare their content and usage before deciding whether either file is redundant.",
          "Matching names do not prove matching content."
        ),
        fingerprint: generateFingerprint("duplicate-files", void 0, {
          nameCandidates: paths.slice().sort().join(",")
        })
      });
    }
    for (const [size, group] of sizeGroups) {
      if (group.length < 2) continue;
      const unreached = group.filter((f) => !hashReportedPaths.has(f.path));
      if (unreached.length < 2) continue;
      const paths = unreached.map((f) => f.path);
      issues.push({
        scannerId: "duplicate-files",
        severity: "info",
        title: "Duplicate file candidates (same size)",
        message: `${paths.length} files share size ${formatSize(size)}`,
        relatedPaths: paths,
        evidence: {
          count: paths.length,
          size,
          paths: paths.join(", ")
        },
        ...describeFinding(
          "candidate",
          `${paths.length} files share the same byte size.`,
          "Compare their content and usage before deciding whether either file is redundant.",
          "Matching sizes do not prove matching content."
        ),
        fingerprint: generateFingerprint("duplicate-files", void 0, {
          sizeCandidates: paths.slice().sort().join(",")
        })
      });
    }
    return issues;
  }
};

// src/scanner/scanners/empty-notes.ts
var emptyNotesScanner = {
  id: "empty-notes",
  async scan(ctx) {
    const issues = [];
    for (const file of ctx.markdownFiles) {
      if (isIgnoredPath(file.path, ctx.ignoredFolders)) continue;
      const content = await ctx.vault.cachedRead(file);
      const body = stripFrontmatterAndTitle(content);
      const wordCount = countWords(body);
      if (wordCount <= ctx.emptyNoteWordThreshold) {
        issues.push({
          scannerId: "empty-notes",
          severity: "warning",
          title: "Empty note",
          message: wordCount === 0 ? "This note has no content besides a title" : `This note only has ${wordCount} word${wordCount > 1 ? "s" : ""} (likely a stub)`,
          primaryPath: file.path,
          relatedPaths: [],
          evidence: { size: file.stat.size, wordCount },
          ...describeFinding(
            "candidate",
            `The note contains ${wordCount} meaningful word${wordCount === 1 ? "" : "s"}, at or below the configured threshold of ${ctx.emptyNoteWordThreshold}.`,
            "Add meaningful content, ignore the finding, or move the note to trash after review.",
            "Intentional placeholders, index notes, and generated stubs can be valid."
          ),
          fingerprint: generateFingerprint("empty-notes", file.path, {}),
          fixAction: {
            kind: "trash-file",
            label: "Delete",
            description: `Move "${file.path}" to trash`,
            targetPaths: [file.path]
          }
        });
      }
    }
    return issues;
  }
};
function stripFrontmatterAndTitle(content) {
  let text = content;
  if (text.startsWith("---")) {
    const end = text.indexOf("\n---", 3);
    if (end !== -1) {
      text = text.slice(end + 4);
    }
  }
  text = text.replace(/^#+\s+.*$/m, "");
  return text;
}
function countWords(text) {
  let count = 0;
  const cjkPattern = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;
  for (const match of text.matchAll(cjkPattern)) {
    void match;
    count++;
  }
  const withoutCjk = text.replace(cjkPattern, " ");
  for (const segment of withoutCjk.split(/\s+/)) {
    if (segment.length > 0) count++;
  }
  return count;
}

// src/utils/network-destination.ts
var LOCAL_HOSTNAME_SUFFIXES = [
  ".localhost",
  ".local",
  ".lan",
  ".internal",
  ".home.arpa"
];
function assessExternalHttpUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch (e) {
    return { allowed: false, reason: "valid URL" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { allowed: false, reason: "HTTP(S)" };
  }
  if (url.username || url.password) {
    return { allowed: false, reason: "credentials" };
  }
  const hostname = normalizeHostname(url.hostname);
  if (isLocalHostname(hostname)) {
    return { allowed: false, reason: "local hostname" };
  }
  if (isPublicIpAddress(hostname) === false) {
    return { allowed: false, reason: "non-public IP address" };
  }
  return { allowed: true, url };
}
function isPublicIpAddress(value) {
  const normalized = normalizeHostname(value);
  const ipv4 = parseIpv4Address(normalized);
  if (ipv4) return isPublicIpv4(ipv4);
  const ipv6 = parseIpv6Address(normalized);
  if (ipv6) return isPublicIpv6(ipv6);
  return null;
}
function normalizeHostname(value) {
  const withoutBrackets = value.startsWith("[") && value.endsWith("]") ? value.slice(1, -1) : value;
  return withoutBrackets.replace(/\.$/, "").toLowerCase();
}
function isLocalHostname(hostname) {
  if (hostname === "localhost") return true;
  return LOCAL_HOSTNAME_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}
function parseIpv4Address(value) {
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const octets = parts.map((part) => {
    if (!/^\d{1,3}$/.test(part)) return Number.NaN;
    return Number(part);
  });
  if (octets.some((octet) => !Number.isInteger(octet) || octet > 255)) return null;
  return octets;
}
function isPublicIpv4([first, second, third]) {
  if (first === 0 || first === 10 || first === 127 || first >= 224) return false;
  if (first === 100 && second >= 64 && second <= 127) return false;
  if (first === 169 && second === 254) return false;
  if (first === 172 && second >= 16 && second <= 31) return false;
  if (first === 192 && second === 0 && third === 0) return false;
  if (first === 192 && second === 0 && third === 2) return false;
  if (first === 192 && second === 88 && third === 99) return false;
  if (first === 192 && second === 168) return false;
  if (first === 198 && (second === 18 || second === 19)) return false;
  if (first === 198 && second === 51 && third === 100) return false;
  if (first === 203 && second === 0 && third === 113) return false;
  return true;
}
function parseIpv6Address(value) {
  const zoneIndex = value.indexOf("%");
  const address = zoneIndex === -1 ? value : value.slice(0, zoneIndex);
  if (!address.includes(":")) return null;
  const doubleColonParts = address.split("::");
  if (doubleColonParts.length > 2) return null;
  const left = parseIpv6Section(doubleColonParts[0]);
  const right = doubleColonParts.length === 2 ? parseIpv6Section(doubleColonParts[1]) : [];
  if (!left || !right) return null;
  if (doubleColonParts.length === 1) {
    return left.length === 8 ? left : null;
  }
  const missing = 8 - left.length - right.length;
  if (missing < 1) return null;
  return [...left, ...Array.from({ length: missing }, () => 0), ...right];
}
function parseIpv6Section(section) {
  if (!section) return [];
  const parts = section.split(":");
  const words = [];
  for (const part of parts) {
    if (part.includes(".")) {
      const ipv4 = parseIpv4Address(part);
      if (!ipv4) return null;
      words.push(ipv4[0] << 8 | ipv4[1], ipv4[2] << 8 | ipv4[3]);
      continue;
    }
    if (!/^[0-9a-f]{1,4}$/i.test(part)) return null;
    words.push(Number.parseInt(part, 16));
  }
  return words;
}
function isPublicIpv6(words) {
  const isIpv4Mapped = words.slice(0, 5).every((word) => word === 0) && words[5] === 65535;
  if (isIpv4Mapped) {
    return isPublicIpv4([
      words[6] >> 8,
      words[6] & 255,
      words[7] >> 8,
      words[7] & 255
    ]);
  }
  if (words.slice(0, 6).every((word) => word === 0)) return false;
  if ((words[0] & 65024) === 64512) return false;
  if ((words[0] & 65472) === 65152) return false;
  if ((words[0] & 65472) === 65216) return false;
  if ((words[0] & 65280) === 65280) return false;
  if (words[0] === 256 && words.slice(1, 4).every((word) => word === 0)) return false;
  if (words[0] === 8193 && words[1] === 2) return false;
  if (words[0] === 8193 && (words[1] & 65520) === 16) return false;
  if (words[0] === 8193 && words[1] === 3512) return false;
  if ((words[0] & 65520) === 16368) return false;
  if (words[0] === 24320) return false;
  return true;
}

// src/scanner/scanners/external-links.ts
var externalLinksScanner = {
  id: "external-links",
  async scan(ctx, onProgress) {
    const issues = [];
    const urlMap = await collectExternalUrls(ctx);
    const { results, skipped: skipped2 } = await checkUrls(urlMap, ctx, onProgress);
    for (const result of results) {
      const issue = makeIssue2(result);
      if (issue) issues.push(issue);
    }
    if (skipped2 > 0) {
      issues.push({
        ...describeFinding(
          "unverified",
          `The scanner reached its ${EXTERNAL_LINK_SCAN_BUDGET_MS / 1e3}-second scan budget before checking ${skipped2} URL(s).`,
          "Run the external-link scanner again or reduce the number of URLs checked at once.",
          "Unchecked URLs may still be healthy or broken."
        ),
        scannerId: "external-links",
        severity: "info",
        title: "External link checks skipped",
        message: `Stopped after ${EXTERNAL_LINK_SCAN_BUDGET_MS / 1e3}s scan budget; ${skipped2} URL(s) were not checked.`,
        relatedPaths: [],
        evidence: {
          skipped: skipped2,
          budgetMs: EXTERNAL_LINK_SCAN_BUDGET_MS
        },
        fingerprint: generateFingerprint("external-links", void 0, {
          skipped: skipped2,
          budgetMs: EXTERNAL_LINK_SCAN_BUDGET_MS
        })
      });
    }
    return issues;
  }
};
var EXTERNAL_LINK_TIMEOUT_MS = 5e3;
var EXTERNAL_LINK_SCAN_BUDGET_MS = 6e4;
var EXTERNAL_LINK_BATCH_SIZE = 5;
async function collectExternalUrls(ctx) {
  var _a, _b;
  const entries = [];
  const seen = /* @__PURE__ */ new Set();
  for (const file of ctx.markdownFiles) {
    if (isIgnoredPath(file.path, ctx.ignoredFolders)) continue;
    const cache = ctx.metadataCache.getFileCache(file);
    if (!cache) continue;
    const links = (_a = cache.links) != null ? _a : [];
    const embeds = (_b = cache.embeds) != null ? _b : [];
    for (const link of [...links, ...embeds]) {
      const href = link.link;
      if (!isExternalUrl(href)) continue;
      if (seen.has(href)) continue;
      seen.add(href);
      entries.push({ url: href, sourcePath: file.path });
    }
    if (cache.frontmatter) {
      for (const value of Object.values(cache.frontmatter)) {
        if (typeof value === "string" && isExternalUrl(value)) {
          if (seen.has(value)) continue;
          seen.add(value);
          entries.push({ url: value, sourcePath: file.path });
        }
      }
    }
    try {
      const content = await ctx.vault.cachedRead(file);
      for (const url of extractBareUrls(content)) {
        if (seen.has(url)) continue;
        seen.add(url);
        entries.push({ url, sourcePath: file.path });
      }
    } catch (e) {
      continue;
    }
  }
  return entries;
}
function isExternalUrl(text) {
  return /^https?:\/\//i.test(text);
}
function extractBareUrls(content) {
  const urls = [];
  const seen = /* @__PURE__ */ new Set();
  const body = stripIgnoredMarkdownRegions(stripFrontmatter(content));
  const urlPattern = /https?:\/\/[^\s<>"']+/gi;
  for (const match of body.matchAll(urlPattern)) {
    const url = trimUrlBoundary(match[0]);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}
function stripFrontmatter(content) {
  const match = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.exec(content);
  return match ? content.slice(match[0].length) : content;
}
function stripIgnoredMarkdownRegions(content) {
  return content.replace(/<!--[\s\S]*?-->/g, "").replace(/^[ \t]*(`{3,}|~{3,})[^\r\n]*\r?\n[\s\S]*?^[ \t]*\1[^\r\n]*$/gm, "").replace(/(`+)[^\r\n]*?\1/g, "");
}
function trimUrlBoundary(url) {
  let trimmed = url;
  while (/[),.;:!?]$/.test(trimmed)) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed;
}
async function checkUrls(urlMap, ctx, onProgress) {
  const results = [];
  const startedAt = Date.now();
  const deadline = startedAt + EXTERNAL_LINK_SCAN_BUDGET_MS;
  const stats = { timedOut: 0, failed: 0, blocked: 0 };
  reportExternalProgress(onProgress, urlMap.length, results.length, stats);
  for (let i = 0; i < urlMap.length; i += EXTERNAL_LINK_BATCH_SIZE) {
    if (Date.now() >= deadline) {
      const skipped2 = urlMap.length - i;
      reportExternalProgress(onProgress, urlMap.length, results.length, stats, skipped2);
      return { results, skipped: skipped2 };
    }
    const timeoutMs = Math.max(1, Math.min(EXTERNAL_LINK_TIMEOUT_MS, deadline - Date.now()));
    const batch = urlMap.slice(i, i + EXTERNAL_LINK_BATCH_SIZE);
    const checks = batch.map((entry) => checkUrlWithTimeout(entry, ctx, timeoutMs));
    const batchResults = await Promise.all(checks);
    for (const result of batchResults) {
      if (result.kind === "blocked") stats.blocked++;
      if (result.kind === "timeout") stats.timedOut++;
      if (result.kind === "failed") stats.failed++;
    }
    results.push(...batchResults);
    reportExternalProgress(onProgress, urlMap.length, results.length, stats);
  }
  return { results, skipped: 0 };
}
function reportExternalProgress(onProgress, total, current, stats, skipped2 = 0) {
  onProgress == null ? void 0 : onProgress({
    type: "scanner-progress",
    scannerId: "external-links",
    scannerIndex: 0,
    scannerTotal: 0,
    phase: "Checking URLs",
    current,
    total,
    message: `blocked ${stats.blocked}, timed out ${stats.timedOut}, failed ${stats.failed}, skipped ${skipped2}`,
    elapsedMs: 0
  });
}
async function checkUrlWithTimeout(entry, ctx, timeoutMs) {
  const controller = new AbortController();
  const result = await withTimeout(
    checkUrl(entry.url, ctx, controller.signal),
    timeoutMs,
    {
      ...entry,
      kind: "timeout",
      timeoutMs
    },
    ctx,
    () => controller.abort()
  );
  return withSourcePath(result, entry.sourcePath);
}
async function checkUrl(url, ctx, signal) {
  const assessment = assessExternalHttpUrl(url);
  if (!assessment.allowed) {
    return {
      url,
      sourcePath: "",
      kind: "blocked",
      reason: assessment.reason
    };
  }
  try {
    if (ctx == null ? void 0 : ctx.requestUrl) {
      const status = await ctx.requestUrl(url, signal);
      return { url, sourcePath: "", kind: "http", status };
    }
    return {
      url,
      sourcePath: "",
      kind: "failed",
      error: "No request adapter configured"
    };
  } catch (error) {
    return {
      url,
      sourcePath: "",
      kind: "failed",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
async function withTimeout(promise, timeoutMs, timeoutValue, ctx, onTimeout) {
  const timer = getTimer(ctx);
  let timeoutId;
  try {
    return await Promise.race([
      promise,
      new Promise((resolve) => {
        timeoutId = timer.setTimeout(() => {
          resolve(timeoutValue);
          onTimeout == null ? void 0 : onTimeout();
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timeoutId) timer.clearTimeout(timeoutId);
  }
}
function getTimer(ctx) {
  var _a, _b;
  return {
    setTimeout: (_a = ctx == null ? void 0 : ctx.setTimeout) != null ? _a : ((callback, delayMs) => window.setTimeout(callback, delayMs)),
    clearTimeout: (_b = ctx == null ? void 0 : ctx.clearTimeout) != null ? _b : ((timeoutId) => window.clearTimeout(timeoutId))
  };
}
function makeIssue2(result) {
  if (result.kind === "http") {
    if (result.status < 400) return null;
    return {
      ...describeFinding(
        "candidate",
        `The server returned HTTP ${result.status} for this URL.`,
        "Open the URL manually, then update or remove it if the failure persists.",
        "Authentication, rate limits, bot protection, and temporary outages can produce a non-success status."
      ),
      scannerId: "external-links",
      severity: "warning",
      title: "Dead external link",
      message: `HTTP ${result.status} \u2014 ${result.url}`,
      primaryPath: result.sourcePath,
      relatedPaths: [],
      evidence: {
        url: result.url,
        status: result.status
      },
      fingerprint: generateFingerprint("external-links", result.sourcePath, {
        url: result.url
      })
    };
  }
  if (result.kind === "blocked") {
    return {
      ...describeFinding(
        "unverified",
        `The external-link safety policy blocked this destination (${result.reason}).`,
        "Review or correct the URL based on the reported reason, then run the scanner again.",
        "Availability was not tested because this URL was rejected before reaching the request adapter."
      ),
      scannerId: "external-links",
      severity: "info",
      title: "External link check blocked",
      message: `Blocked unsafe destination (${result.reason}) \u2014 ${result.url}`,
      primaryPath: result.sourcePath,
      relatedPaths: [],
      evidence: {
        url: result.url,
        reason: result.reason,
        blocked: true
      },
      fingerprint: generateFingerprint("external-links", result.sourcePath, {
        url: result.url,
        blocked: true
      })
    };
  }
  if (result.kind === "timeout") {
    return {
      ...describeFinding(
        "unverified",
        `The URL did not respond within ${result.timeoutMs}ms.`,
        "Retry the scan or open the URL manually.",
        "Slow networks and temporary server load can cause timeouts."
      ),
      scannerId: "external-links",
      severity: "info",
      title: "External link check timed out",
      message: `No response after ${result.timeoutMs}ms \u2014 ${result.url}`,
      primaryPath: result.sourcePath,
      relatedPaths: [],
      evidence: {
        url: result.url,
        timeoutMs: result.timeoutMs
      },
      fingerprint: generateFingerprint("external-links", result.sourcePath, {
        url: result.url,
        timeout: true
      })
    };
  }
  return {
    ...describeFinding(
      "unverified",
      "The URL check failed before an HTTP status was received.",
      "Retry the scan or open the URL manually and inspect the reported error.",
      "DNS, TLS, connectivity, and remote-server failures can be temporary."
    ),
    scannerId: "external-links",
    severity: "info",
    title: "External link check failed",
    message: `Could not check URL \u2014 ${result.url}`,
    primaryPath: result.sourcePath,
    relatedPaths: [],
    evidence: {
      url: result.url,
      error: result.error
    },
    fingerprint: generateFingerprint("external-links", result.sourcePath, {
      url: result.url,
      failed: true
    })
  };
}
function withSourcePath(result, sourcePath) {
  if (result.kind === "http") {
    return { ...result, sourcePath };
  }
  if (result.kind === "timeout") {
    return { ...result, sourcePath };
  }
  return { ...result, sourcePath };
}

// src/utils/frontmatter-type.ts
function inferType(value) {
  if (value === null || value === void 0) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return "date";
    return "string";
  }
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "string";
}
function typesAreCompatible(a, b) {
  if (a === b) return true;
  if (a === "null" || b === "null") return true;
  if (a === "date" && b === "string" || a === "string" && b === "date")
    return true;
  return false;
}

// src/scanner/scanners/frontmatter-types.ts
var frontmatterTypesScanner = {
  id: "frontmatter-types",
  scan(ctx) {
    var _a;
    const issues = [];
    const ignoredProps = new Set(ctx.ignoredProperties);
    const propertyTypes = /* @__PURE__ */ new Map();
    for (const file of ctx.markdownFiles) {
      if (isIgnoredPath(file.path, ctx.ignoredFolders)) continue;
      const cache = ctx.metadataCache.getFileCache(file);
      const frontmatter = cache == null ? void 0 : cache.frontmatter;
      if (!frontmatter) continue;
      for (const [key, value] of Object.entries(frontmatter)) {
        if (key === "position") continue;
        if (ignoredProps.has(key)) continue;
        const type = inferType(value);
        let typeMap = propertyTypes.get(key);
        if (!typeMap) {
          typeMap = /* @__PURE__ */ new Map();
          propertyTypes.set(key, typeMap);
        }
        const paths = (_a = typeMap.get(type)) != null ? _a : [];
        paths.push(file.path);
        typeMap.set(type, paths);
      }
    }
    for (const [prop, typeMap] of propertyTypes) {
      const nonNullTypes = Array.from(typeMap.keys()).filter((t) => t !== "null");
      if (nonNullTypes.length <= 1) continue;
      let hasIncompatible = false;
      let hasDateAmbiguity = false;
      for (let i = 0; i < nonNullTypes.length - 1; i++) {
        for (let j = i + 1; j < nonNullTypes.length; j++) {
          if (!typesAreCompatible(nonNullTypes[i], nonNullTypes[j])) {
            hasIncompatible = true;
          }
          if (nonNullTypes[i] === "string" && nonNullTypes[j] === "date" || nonNullTypes[i] === "date" && nonNullTypes[j] === "string") {
            hasDateAmbiguity = true;
          }
        }
      }
      if (!hasIncompatible && !hasDateAmbiguity) continue;
      const severity = hasIncompatible ? "warning" : "info";
      const title = hasIncompatible ? "Frontmatter type drift" : "Frontmatter type ambiguity";
      const types = Array.from(typeMap.keys());
      const typeSummary = types.map((t) => {
        var _a2, _b;
        const count = (_b = (_a2 = typeMap.get(t)) == null ? void 0 : _a2.length) != null ? _b : 0;
        return `${t} (${count})`;
      }).join(", ");
      const allPaths = [];
      for (const paths of typeMap.values()) {
        allPaths.push(...paths);
      }
      const presentation = hasIncompatible ? describeFinding(
        "confirmed",
        `Property "${prop}" uses incompatible observed value types: ${typeSummary}.`,
        "Review the sampled notes and normalize the property values or ignore this property.",
        "Intentional schema variants can be valid when different notes serve different workflows."
      ) : describeFinding(
        "candidate",
        `Property "${prop}" mixes ISO date-like strings with other string values: ${typeSummary}.`,
        "Review the sampled notes and choose one representation if consistency is required.",
        "The ISO date heuristic may classify intentional string formats differently."
      );
      issues.push({
        scannerId: "frontmatter-types",
        severity,
        title,
        message: `Property "${prop}" has mixed types: ${typeSummary}`,
        relatedPaths: allPaths.slice(0, 10),
        evidence: {
          property: prop,
          types: typeSummary,
          fileCount: allPaths.length
        },
        ...presentation,
        fingerprint: generateFingerprint("frontmatter-types", void 0, {
          property: prop,
          types: types.sort().join(",")
        })
      });
    }
    return issues;
  }
};

// src/utils/file-types.ts
var ATTACHMENT_EXTENSIONS = /* @__PURE__ */ new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "svg",
  "webp",
  "pdf",
  "mp3",
  "mp4",
  "wav",
  "mov",
  "zip"
]);
function isAttachment(path) {
  const ext = getExtension(path);
  return ext !== "" && ATTACHMENT_EXTENSIONS.has(ext);
}
function isMarkdown(path) {
  const ext = getExtension(path);
  return ext === "md";
}

// src/scanner/scanners/large-files.ts
var largeFilesScanner = {
  id: "large-files",
  scan(ctx) {
    const issues = [];
    for (const file of ctx.allFiles) {
      if (isIgnoredPath(file.path, ctx.ignoredFolders)) continue;
      const isMd = isMarkdown(file.path);
      if (isMd && isIgnoredLargeMarkdown(file, ctx)) continue;
      const threshold = isMd ? ctx.largeMarkdownBytes : ctx.largeAttachmentBytes;
      if (file.stat.size > threshold) {
        issues.push({
          scannerId: "large-files",
          severity: "warning",
          title: "Large file",
          message: `File is ${formatSize(file.stat.size)}, exceeds ${formatSize(threshold)} threshold`,
          primaryPath: file.path,
          relatedPaths: [],
          evidence: {
            size: file.stat.size,
            threshold,
            type: isMd ? "markdown" : "attachment"
          },
          ...describeFinding(
            "confirmed",
            `The observed file size of ${formatSize(file.stat.size)} (${file.stat.size} bytes) exceeds the configured ${isMd ? "Markdown" : "attachment"} threshold of ${formatSize(threshold)} (${threshold} bytes).`,
            "Review whether the file belongs in the vault or should be excluded from this scanner.",
            "Large generated notes, media, and workflow artifacts can be expected."
          ),
          fingerprint: generateFingerprint("large-files", file.path, {
            type: isMd ? "markdown" : "attachment"
          })
        });
      }
    }
    issues.sort((a, b) => b.evidence.size - a.evidence.size);
    return issues;
  }
};
function isIgnoredLargeMarkdown(file, ctx) {
  var _a;
  if (ctx.ignoredLargeMarkdownPathPatterns.some(
    (pattern) => matchesGlob(file.path, pattern)
  )) {
    return true;
  }
  if (ctx.ignoredLargeMarkdownFrontmatterKeys.length === 0) return false;
  if (typeof ctx.metadataCache.getFileCache !== "function") return false;
  const frontmatter = (_a = ctx.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter;
  if (!frontmatter) return false;
  return ctx.ignoredLargeMarkdownFrontmatterKeys.some(
    (key) => Object.prototype.hasOwnProperty.call(frontmatter, key)
  );
}

// src/scanner/scanners/orphan-attachments.ts
var orphanAttachmentsScanner = {
  id: "orphan-attachments",
  scan(ctx) {
    const issues = [];
    const referencedPaths = collectReferencedPaths(ctx);
    for (const file of ctx.allFiles) {
      if (isIgnoredPath(file.path, ctx.ignoredFolders)) continue;
      if (!isAttachment(file.path)) continue;
      if (!referencedPaths.has(file.path)) {
        const severity = isRecent(file.stat.mtime) ? "info" : "warning";
        issues.push({
          scannerId: "orphan-attachments",
          severity,
          title: "Orphan attachment",
          message: "This attachment is not referenced by any note",
          primaryPath: file.path,
          relatedPaths: [],
          evidence: {
            lastModified: file.stat.mtime
          },
          ...describeFinding(
            "candidate",
            "No Markdown note references this attachment within the scanned vault metadata.",
            "Review external and generated references before moving the file to trash.",
            "CSS, Canvas, Dataview, publishing pipelines, and external tools can reference files outside this scan boundary."
          ),
          fingerprint: generateFingerprint("orphan-attachments", file.path, {
            orphan: true
          }),
          fixAction: {
            kind: "trash-file",
            label: "Delete",
            description: `Move "${file.path}" to trash`,
            targetPaths: [file.path]
          }
        });
      }
    }
    return issues;
  }
};
function collectReferencedPaths(ctx) {
  var _a, _b, _c, _d;
  const paths = /* @__PURE__ */ new Set();
  const canResolveLinks = typeof ctx.metadataCache.getFirstLinkpathDest === "function";
  for (const file of ctx.markdownFiles) {
    const cache = ctx.metadataCache.getFileCache(file);
    if (!cache) continue;
    const links = (_a = cache.links) != null ? _a : [];
    const embeds = (_b = cache.embeds) != null ? _b : [];
    const frontmatterLinks = (_c = cache.frontmatterLinks) != null ? _c : [];
    for (const link of [...links, ...embeds, ...frontmatterLinks]) {
      const resolvedTarget = canResolveLinks ? (_d = ctx.metadataCache.getFirstLinkpathDest(link.link, file.path)) == null ? void 0 : _d.path : resolveVaultLinkTargets(ctx, link.link, file.path)[0];
      if (resolvedTarget) paths.add(resolvedTarget);
    }
  }
  return paths;
}
function isRecent(mtime) {
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1e3;
  return mtime > oneWeekAgo;
}

// src/utils/tags.ts
function normalizeTagName(value) {
  return value.trim().replace(/^#/, "");
}

// src/scanner/scanners/tag-usage.ts
var tagUsageScanner = {
  id: "tag-usage",
  scan(ctx) {
    var _a, _b, _c, _d;
    const issues = [];
    const tagCounts = /* @__PURE__ */ new Map();
    const tagPaths = /* @__PURE__ */ new Map();
    const watchedTags = Array.from(
      new Set(ctx.watchedTags.map(normalizeTagName).filter(Boolean))
    );
    const watchedSet = new Set(watchedTags);
    for (const file of ctx.markdownFiles) {
      if (isIgnoredPath(file.path, ctx.ignoredFolders)) continue;
      const cache = ctx.metadataCache.getFileCache(file);
      if (!cache) continue;
      const tags = collectTags(cache);
      for (const tag of tags) {
        tagCounts.set(tag, ((_a = tagCounts.get(tag)) != null ? _a : 0) + 1);
        const paths = (_b = tagPaths.get(tag)) != null ? _b : /* @__PURE__ */ new Set();
        paths.add(file.path);
        tagPaths.set(tag, paths);
      }
    }
    for (const [tag, count] of tagCounts) {
      if (count >= ctx.lowUsageTagThreshold) continue;
      if (watchedSet.has(tag)) continue;
      const paths = Array.from((_c = tagPaths.get(tag)) != null ? _c : []).sort();
      issues.push({
        scannerId: "tag-usage",
        severity: "info",
        title: "Low-usage tag",
        message: `Tag "${tag}" is only used ${count} time(s), below threshold of ${ctx.lowUsageTagThreshold}`,
        primaryPath: paths[0],
        relatedPaths: paths.slice(1),
        evidence: { tag, count, threshold: ctx.lowUsageTagThreshold },
        ...describeFinding(
          "confirmed",
          `Tag "${tag}" appears ${count} time${count === 1 ? "" : "s"}, below the configured threshold of ${ctx.lowUsageTagThreshold}.`,
          "Review the tagged notes, then consolidate, keep, or ignore the tag.",
          "Rare tags can be intentional and do not require cleanup."
        ),
        fingerprint: generateFingerprint("tag-usage", void 0, {
          tag,
          lowUsage: true
        })
      });
    }
    for (const watchedTag of watchedTags) {
      const count = (_d = tagCounts.get(watchedTag)) != null ? _d : 0;
      if (count > 0) continue;
      issues.push({
        scannerId: "tag-usage",
        severity: "info",
        title: "Missing watched tag",
        message: `Watched tag "${watchedTag}" does not appear in the vault`,
        relatedPaths: [],
        evidence: { tag: watchedTag, count: 0, watched: true },
        ...describeFinding(
          "confirmed",
          `Tag "${watchedTag}" is in the configured watchlist but does not appear in the vault.`,
          "Add the tag where expected or remove it from the watchlist.",
          "The tag may have been intentionally retired or renamed."
        ),
        fingerprint: generateFingerprint("tag-usage", void 0, {
          tag: watchedTag,
          watched: true
        })
      });
    }
    return issues;
  }
};
function collectTags(cache) {
  var _a;
  const tags = [];
  const frontmatterTags = (_a = cache.frontmatter) == null ? void 0 : _a.tags;
  if (frontmatterTags) {
    if (Array.isArray(frontmatterTags)) {
      for (const t of frontmatterTags) {
        tags.push(String(t).replace(/^#/, ""));
      }
    } else if (typeof frontmatterTags === "string" || typeof frontmatterTags === "number") {
      tags.push(String(frontmatterTags).replace(/^#/, ""));
    }
  }
  const inlineTags = cache.tags;
  if (inlineTags) {
    for (const t of inlineTags) {
      tags.push(t.tag.replace(/^#/, ""));
    }
  }
  return tags;
}

// src/scanner/register-scanners.ts
function registerDefaultScanners(scanRunner) {
  scanRunner.register(brokenLinksScanner);
  scanRunner.register(largeFilesScanner);
  scanRunner.register(orphanAttachmentsScanner);
  scanRunner.register(emptyNotesScanner);
  scanRunner.register(externalLinksScanner);
  scanRunner.register(duplicateFilesScanner);
  scanRunner.register(frontmatterTypesScanner);
  scanRunner.register(tagUsageScanner);
}

// src/settings/settings.ts
function createEmptyIgnoredFoldersByScanner() {
  const result = {};
  for (const id of SCANNER_IDS) {
    result[id] = [];
  }
  return result;
}
var DEFAULT_SETTINGS = {
  enabledScanners: Object.fromEntries(
    SCANNER_IDS.map((id) => [id, id !== "external-links"])
  ),
  enableFixActions: true,
  duplicateKeepMode: "always-ask",
  largeMarkdownBytes: 100 * 1024,
  largeAttachmentBytes: 5 * 1024 * 1024,
  ignoredLargeMarkdownFrontmatterKeys: ["excalidraw-plugin"],
  ignoredLargeMarkdownPathPatterns: [],
  duplicateHashMaxBytes: 1024 * 1024,
  lowUsageTagThreshold: 2,
  emptyNoteWordThreshold: 5,
  watchedTags: [],
  ignoredIssueFingerprints: [],
  ignoredFolders: [],
  ignoredFoldersByScanner: createEmptyIgnoredFoldersByScanner(),
  ignoreUnresolvedNoteLinks: false,
  ignoredProperties: [],
  reportFolderPath: "Vault Inspector Reports"
};

// src/settings/settings-tab.ts
var import_obsidian6 = require("obsidian");
function parseFolderList(value) {
  return [...new Set(
    value.split(",").map((folder) => folder.trim()).filter(Boolean)
  )];
}
var InspectorSettingTab = class extends import_obsidian6.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  getSettingDefinitions() {
    return this.getSections().map(({ heading, items }) => ({
      type: "group",
      heading,
      items: items.map(({ name, desc, render }) => ({
        name,
        ...desc === void 0 ? {} : { desc },
        render
      }))
    }));
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian6.Setting(containerEl).setName("Scanning").setHeading();
    for (const section of this.getSections()) {
      new import_obsidian6.Setting(containerEl).setName(section.heading).setHeading();
      for (const item of section.items) {
        const setting = new import_obsidian6.Setting(containerEl).setName(item.name);
        if (item.desc !== void 0) {
          setting.setDesc(item.desc);
        }
        item.render(setting);
      }
    }
  }
  getSections() {
    return [
      {
        heading: "Enabled scanners",
        items: SCANNER_IDS.map((id) => ({
          name: SCANNER_LABELS[id],
          ...id === "external-links" ? {
            desc: "Opt-in network check for HTTP/HTTPS urls. Can be slower and depends on external sites."
          } : {},
          render: (setting) => {
            setting.addToggle(
              (toggle) => toggle.setValue(this.plugin.settings.enabledScanners[id]).onChange(async (value) => {
                this.plugin.settings.enabledScanners[id] = value;
                await this.plugin.saveSettings();
              })
            );
          }
        }))
      },
      {
        heading: "Fix actions",
        items: [
          {
            name: "Enable fix actions",
            desc: "Show fix buttons for safe automatic actions, including editing notes and moving files to trash.",
            render: (setting) => {
              setting.addToggle(
                (toggle) => toggle.setValue(this.plugin.settings.enableFixActions).onChange(async (value) => {
                  this.plugin.settings.enableFixActions = value;
                  await this.plugin.saveSettings();
                })
              );
            }
          },
          {
            name: "Duplicate file keep mode",
            desc: "Always ask which hash-identical file to keep, or automatically keep the first vault-relative path in alphabetical order.",
            render: (setting) => {
              setting.addDropdown(
                (dropdown) => dropdown.addOption("always-ask", "Always ask").addOption("automatic", "Automatically choose").setValue(this.plugin.settings.duplicateKeepMode).onChange(async (value) => {
                  this.plugin.settings.duplicateKeepMode = value === "automatic" ? "automatic" : "always-ask";
                  await this.plugin.saveSettings();
                })
              );
            }
          }
        ]
      },
      {
        heading: "Thresholds",
        items: [
          {
            name: "Large Markdown threshold (kb)",
            render: (setting) => {
              setting.addSlider(
                (slider) => slider.setLimits(50, 1e3, 50).setValue(this.plugin.settings.largeMarkdownBytes / 1024).onChange(async (value) => {
                  this.plugin.settings.largeMarkdownBytes = value * 1024;
                  await this.plugin.saveSettings();
                })
              );
            }
          },
          {
            name: "Large attachment threshold (mb)",
            render: (setting) => {
              setting.addSlider(
                (slider) => slider.setLimits(1, 50, 1).setValue(this.plugin.settings.largeAttachmentBytes / (1024 * 1024)).onChange(async (value) => {
                  this.plugin.settings.largeAttachmentBytes = value * 1024 * 1024;
                  await this.plugin.saveSettings();
                })
              );
            }
          },
          {
            name: "Ignored large Markdown frontmatter keys",
            desc: "Markdown files with any of these frontmatter keys are excluded from large file checks.",
            render: (setting) => {
              setting.addText(
                (text) => text.setValue(this.plugin.settings.ignoredLargeMarkdownFrontmatterKeys.join(", ")).setPlaceholder("Frontmatter keys to ignore").onChange(async (value) => {
                  this.plugin.settings.ignoredLargeMarkdownFrontmatterKeys = value.split(",").map((key) => key.trim()).filter(Boolean);
                  await this.plugin.saveSettings();
                })
              );
            }
          },
          {
            name: "Ignored large Markdown path patterns",
            desc: "Vault-relative glob patterns excluded from large Markdown checks.",
            render: (setting) => {
              setting.addText(
                (text) => text.setValue(this.plugin.settings.ignoredLargeMarkdownPathPatterns.join(", ")).setPlaceholder("E.g. index/**/*.md, **/*.canvas.md").onChange(async (value) => {
                  this.plugin.settings.ignoredLargeMarkdownPathPatterns = value.split(",").map((pattern) => pattern.trim()).filter(Boolean);
                  await this.plugin.saveSettings();
                })
              );
            }
          },
          {
            name: "Duplicate hash cap (mb)",
            desc: "Files above this size are reported as candidates without content hashing.",
            render: (setting) => {
              setting.addSlider(
                (slider) => slider.setLimits(1, 10, 1).setValue(this.plugin.settings.duplicateHashMaxBytes / (1024 * 1024)).onChange(async (value) => {
                  this.plugin.settings.duplicateHashMaxBytes = value * 1024 * 1024;
                  await this.plugin.saveSettings();
                })
              );
            }
          },
          {
            name: "Empty note word threshold",
            desc: "Notes with this many words or fewer are flagged as empty/stub.",
            render: (setting) => {
              setting.addSlider(
                (slider) => slider.setLimits(0, 20, 1).setValue(this.plugin.settings.emptyNoteWordThreshold).onChange(async (value) => {
                  this.plugin.settings.emptyNoteWordThreshold = value;
                  await this.plugin.saveSettings();
                })
              );
            }
          }
        ]
      },
      {
        heading: "Tags",
        items: [
          {
            name: "Watched tags (comma-separated)",
            render: (setting) => {
              setting.addText(
                (text) => text.setValue(this.plugin.settings.watchedTags.join(", ")).setPlaceholder("E.g. Todo, review, project").onChange(async (value) => {
                  this.plugin.settings.watchedTags = value.split(",").map((tag) => tag.trim()).filter(Boolean);
                  await this.plugin.saveSettings();
                })
              );
            }
          },
          {
            name: "Low usage tag threshold",
            render: (setting) => {
              setting.addSlider(
                (slider) => slider.setLimits(1, 10, 1).setValue(this.plugin.settings.lowUsageTagThreshold).onChange(async (value) => {
                  this.plugin.settings.lowUsageTagThreshold = value;
                  await this.plugin.saveSettings();
                })
              );
            }
          }
        ]
      },
      {
        heading: "Ignored items",
        items: [
          {
            name: "Ignored folders (comma-separated)",
            desc: "Files in these folders are excluded from every scanner.",
            render: (setting) => {
              setting.addText(
                (text) => text.setValue(this.plugin.settings.ignoredFolders.join(", ")).setPlaceholder("E.g. Templates, archive").onChange(async (value) => {
                  this.plugin.settings.ignoredFolders = parseFolderList(value);
                  await this.plugin.saveSettings();
                })
              );
            }
          },
          {
            name: "Ignore unresolved note links",
            desc: "Unresolved plain wikilinks such as [[Future Note]] are treated as intentional. Embeds, missing attachments, Markdown links, and missing headings are still reported. Path-like wikilinks are also ignored, so leave this off when typos must fail the scan.",
            render: (setting) => {
              setting.addToggle(
                (toggle) => toggle.setValue(this.plugin.settings.ignoreUnresolvedNoteLinks).onChange(async (value) => {
                  this.plugin.settings.ignoreUnresolvedNoteLinks = value;
                  await this.plugin.saveSettings();
                })
              );
            }
          },
          {
            name: "Ignored frontmatter properties (comma-separated)",
            desc: "These properties are excluded from type consistency checks.",
            render: (setting) => {
              setting.addText(
                (text) => text.setValue(this.plugin.settings.ignoredProperties.join(", ")).setPlaceholder("E.g. Cssclasses, aliases").onChange(async (value) => {
                  this.plugin.settings.ignoredProperties = value.split(",").map((property) => property.trim()).filter(Boolean);
                  await this.plugin.saveSettings();
                })
              );
            }
          }
        ]
      },
      {
        heading: "Scanner-specific ignored folders",
        items: SCANNER_IDS.map((id) => ({
          name: SCANNER_LABELS[id],
          desc: `Additional folders excluded only from ${SCANNER_LABELS[id]}.`,
          render: (setting) => {
            setting.addText(
              (text) => text.setValue(
                this.plugin.settings.ignoredFoldersByScanner[id].join(", ")
              ).setPlaceholder("E.g. Templates, archive").onChange(async (value) => {
                this.plugin.settings.ignoredFoldersByScanner[id] = parseFolderList(value);
                await this.plugin.saveSettings();
              })
            );
          }
        }))
      },
      {
        heading: "Export",
        items: [
          {
            name: "Report folder",
            desc: "Folder for exported Markdown reports.",
            render: (setting) => {
              setting.addText(
                (text) => text.setValue(this.plugin.settings.reportFolderPath).setPlaceholder("Inspector reports").onChange(async (value) => {
                  this.plugin.settings.reportFolderPath = value.trim() || "Inspector reports";
                  await this.plugin.saveSettings();
                })
              );
            }
          }
        ]
      }
    ];
  }
};

// src/report/markdown-export.ts
function generateMarkdownReport(result, mode = "full") {
  var _a, _b, _c;
  const lines = [];
  const now = /* @__PURE__ */ new Date();
  lines.push(mode === "summary" ? "# Vault Inspector Summary" : "# Vault Inspector Report");
  lines.push(``);
  lines.push(`- **Date:** ${now.toLocaleString()}`);
  lines.push(`- **Files scanned:** ${result.filesScanned}`);
  lines.push(`- **Duration:** ${formatDuration(result.finishedAt - result.startedAt)}`);
  lines.push(`- **Scanners run:** ${result.scannersRun.length}`);
  lines.push(``);
  const errors = result.issues.filter((i) => i.severity === "error").length;
  const warnings = result.issues.filter((i) => i.severity === "warning").length;
  const infos = result.issues.filter((i) => i.severity === "info").length;
  lines.push(`## Summary`);
  lines.push(``);
  lines.push(`| Severity | Count |`);
  lines.push(`|---|---|`);
  lines.push(`| Total | ${result.issues.length} |`);
  lines.push(`| Errors | ${errors} |`);
  lines.push(`| Warnings | ${warnings} |`);
  lines.push(`| Info | ${infos} |`);
  lines.push(``);
  const grouped = groupByScanner2(result.issues);
  if (mode === "summary") {
    lines.push("Finding details are omitted from this summary.");
    lines.push(``);
    lines.push("## Findings by scanner");
    lines.push(``);
    lines.push("| Scanner | Findings |");
    lines.push("|---|---|");
    for (const scannerId of result.scannersRun) {
      lines.push(`| ${SCANNER_LABELS[scannerId]} | ${((_a = grouped[scannerId]) != null ? _a : []).length} |`);
    }
    lines.push(``);
    return lines.join("\n");
  }
  for (const scannerId of result.scannersRun) {
    const issues = (_b = grouped[scannerId]) != null ? _b : [];
    lines.push(`## ${SCANNER_LABELS[scannerId]} (${issues.length})`);
    lines.push(``);
    if (issues.length === 0) {
      lines.push(`No issues found.`);
      lines.push(``);
      continue;
    }
    for (const issue of issues) {
      lines.push(`### ${escapeMd(issue.title)}`);
      lines.push(``);
      lines.push(`- **Severity:** ${issue.severity}`);
      lines.push(`- **Classification:** ${issue.classification}`);
      lines.push(`- **Why:** ${escapeMd(issue.explanation.why)}`);
      if (issue.explanation.caveat) {
        lines.push(`- **Caveat:** ${escapeMd(issue.explanation.caveat)}`);
      }
      lines.push(`- **Next step:** ${escapeMd(issue.explanation.nextStep)}`);
      const location = (_c = issue.primaryPath) != null ? _c : issue.relatedPaths[0];
      if (location) lines.push(`- **Location:** \`${escapeInlineCode(location)}\``);
      lines.push(`- **Message:** ${escapeMd(issue.message)}`);
      for (const detail of getMarkdownDetails(issue)) {
        if ("value" in detail) {
          lines.push(`- **${detail.label}:** ${detail.value}`);
        } else {
          lines.push(`- **${detail.label}:**`);
          for (const item of detail.items) {
            lines.push(`  - ${item}`);
          }
        }
      }
      lines.push(``);
    }
  }
  return lines.join("\n");
}
function getMarkdownDetails(issue) {
  const details = [];
  const target = getIssueTarget2(issue);
  if (target) details.push({ label: getTargetLabel2(issue), value: formatCode(target) });
  if (issue.scannerId === "external-links") {
    const status = getNumber2(issue.evidence.status);
    const timeoutMs = getNumber2(issue.evidence.timeoutMs);
    const error = issue.evidence.error;
    if (status !== null) details.push({ label: "Status", value: String(status) });
    if (timeoutMs !== null) details.push({ label: "Timeout", value: `${timeoutMs}ms` });
    if (typeof error === "string") details.push({ label: "Error", value: escapeMd(error) });
  }
  if (issue.scannerId === "broken-links") {
    const link = issue.evidence.link;
    if (typeof link === "string") details.push({ label: "Link text", value: formatCode(link) });
  }
  if (issue.scannerId === "duplicate-files") {
    const count = getNumber2(issue.evidence.count);
    if (count !== null) details.push({ label: "Count", value: String(count) });
    const size = getNumber2(issue.evidence.size);
    if (size !== null) details.push({ label: "Size", value: formatSize(size) });
    const paths = getEvidencePaths2(issue);
    if (paths.length > 0) {
      details.push({
        label: "Files",
        items: paths.map((path) => formatCode(path))
      });
    }
  }
  if (issue.scannerId === "frontmatter-types") {
    const property = issue.evidence.property;
    const types = issue.evidence.types;
    const fileCount = getNumber2(issue.evidence.fileCount);
    if (typeof property === "string") details.push({ label: "Property", value: formatCode(property) });
    if (typeof types === "string") details.push({ label: "Types", value: escapeMd(types) });
    if (fileCount !== null) details.push({ label: "Files", value: String(fileCount) });
    if (issue.relatedPaths.length > 0) {
      details.push({
        label: "Samples",
        items: issue.relatedPaths.map((path) => formatCode(path))
      });
    }
  }
  if (issue.scannerId === "tag-usage") {
    const tag = issue.evidence.tag;
    const count = getNumber2(issue.evidence.count);
    const threshold = getNumber2(issue.evidence.threshold);
    if (typeof tag === "string") details.push({ label: "Tag", value: formatTag2(tag) });
    if (count !== null) details.push({ label: "Count", value: String(count) });
    if (threshold !== null) details.push({ label: "Threshold", value: String(threshold) });
    const paths = [issue.primaryPath, ...issue.relatedPaths].filter((path) => Boolean(path));
    if (paths.length > 0) {
      details.push({
        label: "Files",
        items: paths.map((path) => formatCode(path))
      });
    }
  }
  if (issue.scannerId === "large-files") {
    const size = getNumber2(issue.evidence.size);
    const threshold = getNumber2(issue.evidence.threshold);
    const type = issue.evidence.type;
    if (size !== null) details.push({ label: "Size", value: formatSize(size) });
    if (threshold !== null) details.push({ label: "Threshold", value: formatSize(threshold) });
    if (typeof type === "string") details.push({ label: "Type", value: escapeMd(type) });
  }
  if (issue.scannerId === "orphan-attachments") {
    const lastModified = getNumber2(issue.evidence.lastModified);
    if (lastModified !== null) {
      details.push({ label: "Modified", value: new Date(lastModified).toLocaleString() });
    }
  }
  if (issue.scannerId === "empty-notes") {
    const size = getNumber2(issue.evidence.size);
    if (size !== null) details.push({ label: "Size", value: formatSize(size) });
  }
  return details;
}
function getIssueTarget2(issue) {
  const url = issue.evidence.url;
  if (typeof url === "string") return url;
  const target = issue.evidence.target;
  if (typeof target === "string") return target;
  return null;
}
function getTargetLabel2(issue) {
  if (issue.scannerId === "external-links") return "URL";
  if (issue.scannerId === "broken-links") return "Target";
  return "Target";
}
function getEvidencePaths2(issue) {
  const paths = issue.evidence.paths;
  if (typeof paths !== "string") return issue.relatedPaths;
  return paths.split(",").map((path) => path.trim()).filter(Boolean);
}
function getNumber2(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function formatTag2(tag) {
  return tag.startsWith("#") ? tag : `#${tag}`;
}
function formatCode(text) {
  return `\`${escapeInlineCode(text)}\``;
}
function groupByScanner2(issues) {
  const groups = {};
  for (const issue of issues) {
    if (!groups[issue.scannerId]) groups[issue.scannerId] = [];
    groups[issue.scannerId].push(issue);
  }
  return groups;
}
function escapeMd(text) {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ");
}
function escapeInlineCode(text) {
  return text.replace(/`/g, "\\`");
}

// src/report/export-warning-modal.ts
var import_obsidian7 = require("obsidian");
function showLargeReportWarningModal(app, details) {
  return new Promise((resolve) => {
    new LargeReportWarningModal(app, details, resolve).open();
  });
}
var LargeReportWarningModal = class extends import_obsidian7.Modal {
  constructor(app, details, resolve) {
    super(app);
    this.details = details;
    this.settle = createSingleUseResolver(resolve);
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("vi-confirm-modal");
    contentEl.createEl("h3", { text: "Large report warning" });
    contentEl.createEl("p", {
      text: "The full report exceeds the one-mebibyte threshold and may make Obsidian unresponsive while indexing it."
    });
    this.renderDetail("Full report size", formatSize(this.details.reportBytes));
    this.renderDetail("Warning threshold", formatSize(this.details.thresholdBytes));
    this.renderDetail("Active findings", String(this.details.findingCount));
    contentEl.createEl("p", {
      text: "A summary keeps scan totals while omitting per-finding details."
    });
    const buttons = contentEl.createDiv({
      cls: "vi-confirm-buttons vi-large-report-buttons"
    });
    buttons.createEl("button", {
      text: "Cancel",
      attr: { type: "button" }
    }).addEventListener("click", () => this.finish(null));
    buttons.createEl("button", {
      text: "Export full report anyway",
      attr: { type: "button" }
    }).addEventListener("click", () => this.finish("full"));
    buttons.createEl("button", {
      cls: "mod-cta",
      text: "Export summary only",
      attr: { type: "button" }
    }).addEventListener("click", () => this.finish("summary"));
  }
  onClose() {
    this.contentEl.empty();
    this.settle(null);
  }
  renderDetail(label, value) {
    const row = this.contentEl.createDiv({ cls: "vi-issue-target" });
    row.createSpan({ cls: "vi-issue-target-label", text: label });
    row.createSpan({ cls: "vi-issue-target-value", text: value });
  }
  finish(decision) {
    if (this.settle(decision)) this.close();
  }
};

// src/report/report-export.ts
var MAX_SAFE_VAULT_REPORT_BYTES = 1024 * 1024;
function getUtf8ByteLength(value) {
  return new TextEncoder().encode(value).byteLength;
}
function getReportExportPreflight(report) {
  const byteLength = getUtf8ByteLength(report);
  return {
    byteLength,
    requiresConfirmation: byteLength > MAX_SAFE_VAULT_REPORT_BYTES
  };
}

// src/fix/fix-executor.ts
var import_obsidian8 = require("obsidian");
async function executeFixAction(app, action) {
  switch (action.kind) {
    case "trash-file":
      return trashFiles(app, action.targetPaths);
    case "remove-link-text":
      return removeLinkText(app, action.targetPaths[0], action.linkText);
    default:
      return 0;
  }
}
async function trashFiles(app, paths) {
  let count = 0;
  for (const path of paths) {
    const file = app.vault.getAbstractFileByPath(path);
    if (file) {
      await app.fileManager.trashFile(file);
      count++;
    }
  }
  return count;
}
async function removeLinkText(app, sourcePath, linkText) {
  const file = app.vault.getAbstractFileByPath(sourcePath);
  if (!(file instanceof import_obsidian8.TFile)) return 0;
  const content = await app.vault.read(file);
  const pattern = new RegExp(`!?\\[\\[${escapeRegex(linkText)}\\]\\]`, "g");
  const protectedRanges = findProtectedMarkdownRanges(content);
  let cursor = 0;
  let updated = "";
  let removed = false;
  for (const match of content.matchAll(pattern)) {
    const start = match.index;
    const end = start + match[0].length;
    if (protectedRanges.some((range) => start < range.end && end > range.start)) {
      continue;
    }
    updated += content.slice(cursor, start);
    cursor = end;
    removed = true;
  }
  if (removed) updated += content.slice(cursor);
  else updated = content;
  if (updated === content) return 0;
  await app.vault.modify(file, updated);
  return 1;
}
function findProtectedMarkdownRanges(content) {
  const ranges = [
    ...findFencedCodeRanges(content),
    ...findHtmlCommentRanges(content)
  ];
  ranges.push(...findInlineCodeRanges(content, ranges));
  return mergeRanges(ranges);
}
function findFencedCodeRanges(content) {
  const ranges = [];
  let lineStart = 0;
  let fence = null;
  while (lineStart < content.length) {
    const newline = content.indexOf("\n", lineStart);
    const lineEnd = newline === -1 ? content.length : newline + 1;
    const line = content.slice(lineStart, newline === -1 ? content.length : newline);
    if (fence) {
      const closingFence = new RegExp(
        `^ {0,3}${escapeRegex(fence.char)}{${fence.length},}[\\t ]*$`
      );
      if (closingFence.test(line)) {
        ranges.push({ start: fence.start, end: lineEnd });
        fence = null;
      }
    } else {
      const openingFence = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
      if (openingFence && (openingFence[1][0] === "~" || !openingFence[2].includes("`"))) {
        fence = {
          char: openingFence[1][0],
          length: openingFence[1].length,
          start: lineStart
        };
      }
    }
    lineStart = lineEnd;
  }
  if (fence) ranges.push({ start: fence.start, end: content.length });
  return ranges;
}
function findHtmlCommentRanges(content) {
  const ranges = [];
  let searchFrom = 0;
  while (searchFrom < content.length) {
    const start = content.indexOf("<!--", searchFrom);
    if (start === -1) break;
    const closing = content.indexOf("-->", start + 4);
    const end = closing === -1 ? content.length : closing + 3;
    ranges.push({ start, end });
    searchFrom = end;
  }
  return ranges;
}
function findInlineCodeRanges(content, excludedRanges) {
  const ranges = [];
  let index = 0;
  while (index < content.length) {
    if (content[index] !== "`" || containsIndex(excludedRanges, index)) {
      index++;
      continue;
    }
    const start = index;
    while (content[index] === "`") index++;
    const marker = content.slice(start, index);
    let closing = content.indexOf(marker, index);
    while (closing !== -1 && (content[closing - 1] === "`" || content[closing + marker.length] === "`" || containsIndex(excludedRanges, closing))) {
      closing = content.indexOf(marker, closing + marker.length);
    }
    if (closing === -1) continue;
    const end = closing + marker.length;
    ranges.push({ start, end });
    index = end;
  }
  return ranges;
}
function containsIndex(ranges, index) {
  return ranges.some((range) => index >= range.start && index < range.end);
}
function mergeRanges(ranges) {
  const sorted = [...ranges].sort((left, right) => left.start - right.start);
  const merged = [];
  for (const range of sorted) {
    const previous = merged[merged.length - 1];
    if (previous && range.start <= previous.end) {
      previous.end = Math.max(previous.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// src/fix/fix-runner.ts
async function runFixBatch(issues, decisions, dependencies) {
  const decisionsByFingerprint = new Map(
    decisions.map((decision) => [decision.fingerprint, decision])
  );
  const outcomes = issues.map(() => null);
  const pending = [];
  for (const [index, issue] of issues.entries()) {
    const decision = decisionsByFingerprint.get(issue.fingerprint);
    if (!decision) {
      outcomes[index] = skipped(
        issue,
        "No confirmed fix decision was available."
      );
      continue;
    }
    const freshResult = await dependencies.scan();
    const freshIssue = freshResult ? [...freshResult.issues, ...freshResult.ignoredIssues].find(
      (candidate) => candidate.fingerprint === issue.fingerprint
    ) : void 0;
    const freshAction = getFreshFixAction(issue, freshIssue, decision);
    if (!freshAction) {
      outcomes[index] = skipped(
        issue,
        freshResult ? "The finding or fix evidence changed before execution." : "The preflight scan did not complete."
      );
      continue;
    }
    try {
      pending.push({
        index,
        fingerprint: issue.fingerprint,
        affectedPaths: [...freshAction.targetPaths],
        affectedCount: await dependencies.execute(freshAction)
      });
    } catch (error) {
      outcomes[index] = {
        fingerprint: issue.fingerprint,
        outcome: "failed",
        phase: "execution",
        message: error instanceof Error ? error.message : String(error),
        affectedPaths: [...freshAction.targetPaths]
      };
    }
  }
  const verificationResult = await dependencies.scan();
  if (!verificationResult) {
    for (const action of pending) {
      outcomes[action.index] = {
        fingerprint: action.fingerprint,
        outcome: "failed",
        phase: "verification",
        message: "The final verification scan did not complete.",
        affectedPaths: action.affectedPaths
      };
    }
  } else {
    const remaining = new Set([
      ...verificationResult.issues,
      ...verificationResult.ignoredIssues
    ].map((issue) => issue.fingerprint));
    for (const action of pending) {
      const stillPresent = remaining.has(action.fingerprint);
      outcomes[action.index] = {
        fingerprint: action.fingerprint,
        outcome: stillPresent ? "still-present" : "fixed",
        message: stillPresent ? `The finding remains after ${action.affectedCount} change(s).` : `Verified after ${action.affectedCount} change(s).`,
        affectedPaths: action.affectedPaths
      };
    }
  }
  return {
    outcomes: outcomes.filter(
      (outcome) => outcome !== null
    ),
    verificationResult
  };
}
function skipped(issue, message) {
  var _a, _b;
  return {
    fingerprint: issue.fingerprint,
    outcome: "skipped",
    phase: "preflight",
    message,
    affectedPaths: [...(_b = (_a = issue.fixAction) == null ? void 0 : _a.targetPaths) != null ? _b : []]
  };
}

// src/snapshot/scan-snapshot.ts
var SNAPSHOT_SCHEMA_VERSION = 1;
var COMPARISON_VERSION = 1;
function createScanSnapshot(result, scanProfile, toolVersion, createdAt = Date.now()) {
  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    comparisonVersion: COMPARISON_VERSION,
    toolVersion,
    createdAt,
    scanProfile,
    issues: [
      ...result.issues.map((issue) => toSnapshotIssue(issue, false)),
      ...result.ignoredIssues.map((issue) => toSnapshotIssue(issue, true))
    ]
  };
}
function isScanSnapshot(value) {
  if (!isPlainRecord(value)) return false;
  if (!hasOnlyKeys(value, [
    "schemaVersion",
    "comparisonVersion",
    "toolVersion",
    "createdAt",
    "scanProfile",
    "issues"
  ])) {
    return false;
  }
  if (value.schemaVersion !== SNAPSHOT_SCHEMA_VERSION) return false;
  if (typeof value.comparisonVersion !== "number" || !Number.isSafeInteger(value.comparisonVersion) || value.comparisonVersion <= 0) {
    return false;
  }
  if (typeof value.toolVersion !== "string") return false;
  if (typeof value.createdAt !== "number" || !Number.isFinite(value.createdAt)) return false;
  if (typeof value.scanProfile !== "string") return false;
  if (!Array.isArray(value.issues)) return false;
  const fingerprints = /* @__PURE__ */ new Set();
  for (const issue of value.issues) {
    if (!isSnapshotIssue(issue)) return false;
    if (fingerprints.has(issue.fingerprint)) return false;
    fingerprints.add(issue.fingerprint);
  }
  return true;
}
function toSnapshotIssue(issue, ignored) {
  return {
    fingerprint: issue.fingerprint,
    scannerId: issue.scannerId,
    severity: issue.severity,
    classification: issue.classification,
    title: issue.title,
    message: issue.message,
    ...issue.primaryPath === void 0 ? {} : { primaryPath: issue.primaryPath },
    relatedPaths: [...issue.relatedPaths],
    evidence: { ...issue.evidence },
    explanation: { ...issue.explanation },
    ignored
  };
}
function isSnapshotIssue(value) {
  if (!isPlainRecord(value)) return false;
  if (!hasOnlyKeys(value, [
    "fingerprint",
    "scannerId",
    "severity",
    "classification",
    "title",
    "message",
    "primaryPath",
    "relatedPaths",
    "evidence",
    "explanation",
    "ignored"
  ])) {
    return false;
  }
  if (typeof value.fingerprint !== "string" || value.fingerprint.trim() === "") {
    return false;
  }
  if (!SCANNER_IDS.includes(value.scannerId)) return false;
  if (!isOneOf(value.severity, ["info", "warning", "error"])) return false;
  if (!isOneOf(value.classification, ["confirmed", "candidate", "unverified"])) {
    return false;
  }
  if (typeof value.title !== "string" || typeof value.message !== "string") return false;
  if (value.primaryPath !== void 0 && typeof value.primaryPath !== "string") return false;
  if (!Array.isArray(value.relatedPaths)) return false;
  if (!value.relatedPaths.every((path) => typeof path === "string")) return false;
  if (!isScalarRecord(value.evidence)) return false;
  if (!isFindingExplanation(value.explanation)) return false;
  return typeof value.ignored === "boolean";
}
function isFindingExplanation(value) {
  if (!isPlainRecord(value)) return false;
  if (!hasOnlyKeys(value, ["why", "caveat", "nextStep"])) return false;
  if (typeof value.why !== "string" || typeof value.nextStep !== "string") return false;
  return value.caveat === void 0 || typeof value.caveat === "string";
}
function isScalarRecord(value) {
  if (!isPlainRecord(value)) return false;
  return Reflect.ownKeys(value).every((key) => {
    if (typeof key !== "string") return false;
    const item = value[key];
    return typeof item === "string" || typeof item === "boolean" || typeof item === "number" && Number.isFinite(item);
  });
}
function isPlainRecord(value) {
  if (!isRecord(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function hasOnlyKeys(value, allowed) {
  return Reflect.ownKeys(value).every(
    (key) => typeof key === "string" && allowed.includes(key)
  );
}
function isOneOf(value, allowed) {
  return typeof value === "string" && allowed.includes(value);
}

// src/settings/plugin-data.ts
function parsePluginData(value) {
  if (!isRecord2(value)) {
    return {
      settings: {},
      lastSuccessfulSnapshot: null,
      legacy: true
    };
  }
  if (isRecord2(value.settings)) {
    return {
      settings: value.settings,
      lastSuccessfulSnapshot: isScanSnapshot(value.lastSuccessfulSnapshot) ? value.lastSuccessfulSnapshot : null,
      legacy: false
    };
  }
  return {
    settings: value,
    lastSuccessfulSnapshot: null,
    legacy: true
  };
}
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// src/scanner/scan-profile.ts
async function createScanProfile(settings) {
  const canonical = {
    enabledScanners: SCANNER_IDS.filter((scannerId) => settings.enabledScanners[scannerId]),
    ignoredFolders: normalizeFolders(settings.ignoredFolders),
    ignoredFoldersByScanner: Object.fromEntries(
      SCANNER_IDS.map((scannerId) => {
        var _a;
        return [
          scannerId,
          normalizeFolders((_a = settings.ignoredFoldersByScanner[scannerId]) != null ? _a : [])
        ];
      })
    ),
    ignoreUnresolvedNoteLinks: settings.ignoreUnresolvedNoteLinks,
    largeMarkdownBytes: settings.largeMarkdownBytes,
    largeAttachmentBytes: settings.largeAttachmentBytes,
    ignoredLargeMarkdownFrontmatterKeys: normalizeSet(
      settings.ignoredLargeMarkdownFrontmatterKeys
    ),
    ignoredLargeMarkdownPathPatterns: normalizeSet(
      settings.ignoredLargeMarkdownPathPatterns
    ),
    duplicateHashMaxBytes: settings.duplicateHashMaxBytes,
    lowUsageTagThreshold: settings.lowUsageTagThreshold,
    emptyNoteWordThreshold: settings.emptyNoteWordThreshold,
    watchedTags: normalizeWatchedTags(settings.watchedTags),
    ignoredProperties: normalizeSet(settings.ignoredProperties)
  };
  return hashContent(new TextEncoder().encode(JSON.stringify(canonical)).buffer);
}
function normalizeSet(values) {
  return Array.from(new Set(values)).sort();
}
function normalizeWatchedTags(values) {
  return normalizeSet(values.map(normalizeTagName).filter(Boolean));
}
function normalizeFolders(values) {
  return normalizeSet(values.map(normalizePath).filter(Boolean));
}

// src/scanner/result-diff.ts
function compareScanResult(current, snapshot, currentProfile) {
  if (snapshot === null) return unavailable("first-scan");
  if (snapshot.comparisonVersion !== COMPARISON_VERSION) {
    return unavailable("semantics-changed");
  }
  if (snapshot.scanProfile !== currentProfile) return unavailable("settings-changed");
  const previousByFingerprint = new Map(
    snapshot.issues.map((issue) => [issue.fingerprint, issue])
  );
  const statuses = /* @__PURE__ */ new Map();
  const currentFingerprints = /* @__PURE__ */ new Set();
  for (const issue of current.issues) {
    currentFingerprints.add(issue.fingerprint);
    statuses.set(
      issue.fingerprint,
      previousByFingerprint.has(issue.fingerprint) ? "persisting" : "new"
    );
  }
  for (const issue of current.ignoredIssues) {
    currentFingerprints.add(issue.fingerprint);
    statuses.set(
      issue.fingerprint,
      previousByFingerprint.has(issue.fingerprint) ? "persisting" : "new"
    );
  }
  const resolvedIssues = snapshot.issues.filter(
    (issue) => !currentFingerprints.has(issue.fingerprint)
  );
  return { available: true, statuses, resolvedIssues };
}
function unavailable(reason) {
  return {
    available: false,
    reason,
    statuses: /* @__PURE__ */ new Map(),
    resolvedIssues: []
  };
}

// src/utils/open-plugin-settings.ts
function openPluginSettings(app, pluginId) {
  const setting = app.setting;
  if (!setting || typeof setting.open !== "function" || typeof setting.openTabById !== "function") {
    return false;
  }
  const availableSetting = setting;
  try {
    availableSetting.open();
    availableSetting.openTabById(pluginId);
    return true;
  } catch (e) {
    return false;
  }
}

// src/main.ts
var VaultInspectorPlugin = class extends import_obsidian9.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    this.lastSuccessfulSnapshot = null;
    this.saveQueue = Promise.resolve();
    this.operationQueue = Promise.resolve();
    this.scanRunner = new ScanRunner(async (url) => {
      const response = await (0, import_obsidian9.requestUrl)({ url, method: "HEAD" });
      return response.status;
    }, {
      setTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),
      clearTimeout: (timeoutId) => window.clearTimeout(timeoutId)
    });
  }
  async onload() {
    await this.loadSettings();
    this.registerView(VIEW_TYPE_INSPECTOR, (leaf) => {
      const view = new InspectorView(leaf);
      this.configureView(view);
      return view;
    });
    this.addCommand({
      id: "run-scan",
      name: "Run scan",
      callback: () => this.runScan()
    });
    this.addCommand({
      id: "export-report",
      name: "Export report",
      callback: () => this.exportReport()
    });
    registerDefaultScanners(this.scanRunner);
    this.addSettingTab(new InspectorSettingTab(this.app, this));
    this.addRibbonIcon("shield-check", "Run scan", () => this.runScan());
  }
  onunload() {
  }
  async loadSettings() {
    const parsed = parsePluginData(await this.loadData());
    const loaded = parsed.settings;
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...loaded,
      enabledScanners: {
        ...DEFAULT_SETTINGS.enabledScanners,
        ...loaded.enabledScanners
      },
      ignoredFoldersByScanner: {
        ...createEmptyIgnoredFoldersByScanner(),
        ...loaded.ignoredFoldersByScanner
      }
    };
    this.lastSuccessfulSnapshot = parsed.lastSuccessfulSnapshot;
    if (migrateExcalidrawFrontmatterKey(this.settings, loaded)) {
      await this.saveSettings();
    }
  }
  async saveSettings() {
    await this.persistPluginData();
  }
  persistPluginData(options) {
    const write = this.saveQueue.catch(() => void 0).then(async () => {
      var _a, _b;
      const snapshot = (_a = options == null ? void 0 : options.acceptedSnapshot) != null ? _a : this.lastSuccessfulSnapshot;
      const data = {
        settings: structuredClone((_b = options == null ? void 0 : options.settings) != null ? _b : this.settings),
        ...snapshot ? { lastSuccessfulSnapshot: structuredClone(snapshot) } : {}
      };
      await this.saveData(data);
      if (options == null ? void 0 : options.acceptedSnapshot) {
        this.lastSuccessfulSnapshot = options.acceptedSnapshot;
      }
    });
    this.saveQueue = write;
    return write;
  }
  async runScan() {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_INSPECTOR)[0];
    if (!leaf) {
      const rightLeaf = this.app.workspace.getRightLeaf(false);
      if (!rightLeaf) return;
      leaf = rightLeaf;
      await leaf.setViewState({ type: VIEW_TYPE_INSPECTOR, active: true });
    }
    await this.app.workspace.revealLeaf(leaf);
    const view = leaf.view;
    this.configureView(view);
    await this.scanAndRender(view);
  }
  configureView(view) {
    view.setCallbacks({
      onIgnoreAllIssues: (issues) => this.enqueueOperation(async () => {
        const requestedIssues = uniqueIssuesByFingerprint(issues);
        if (requestedIssues.length === 0) return;
        const fingerprints = requestedIssues.map((issue) => issue.fingerprint);
        const candidate = structuredClone(this.settings);
        candidate.ignoredIssueFingerprints = mergeUnique(
          candidate.ignoredIssueFingerprints,
          fingerprints
        );
        try {
          await this.persistPluginData({ settings: candidate });
        } catch (error) {
          view.setOperationOutcomes(requestedIssues.map((issue) => ({
            fingerprint: issue.fingerprint,
            outcome: "failed",
            message: `Failed to ignore issue: ${errorMessage(error)}`,
            affectedPaths: getAffectedIssuePaths(issue)
          })));
          return;
        }
        this.settings.ignoredIssueFingerprints = mergeUnique(
          this.settings.ignoredIssueFingerprints,
          fingerprints
        );
        await this.performScanAndRenderHandled(view);
        view.setOperationOutcomes(requestedIssues.map((issue) => ({
          fingerprint: issue.fingerprint,
          outcome: "ignored",
          message: `Ignored ${issue.title}`,
          affectedPaths: getAffectedIssuePaths(issue)
        })));
      }),
      onRestoreIssues: (issues) => this.enqueueOperation(async () => {
        const requestedIssues = uniqueIssuesByFingerprint(issues);
        if (requestedIssues.length === 0) return;
        const toRestore = new Set(requestedIssues.map((issue) => issue.fingerprint));
        const candidate = structuredClone(this.settings);
        candidate.ignoredIssueFingerprints = candidate.ignoredIssueFingerprints.filter(
          (fp) => !toRestore.has(fp)
        );
        try {
          await this.persistPluginData({ settings: candidate });
        } catch (error) {
          view.setOperationOutcomes(requestedIssues.map((issue) => ({
            fingerprint: issue.fingerprint,
            outcome: "failed",
            message: `Failed to restore issue: ${errorMessage(error)}`,
            affectedPaths: getAffectedIssuePaths(issue)
          })));
          return;
        }
        this.settings.ignoredIssueFingerprints = this.settings.ignoredIssueFingerprints.filter(
          (fp) => !toRestore.has(fp)
        );
        await this.performScanAndRenderHandled(view);
        view.setOperationOutcomes(requestedIssues.map((issue) => ({
          fingerprint: issue.fingerprint,
          outcome: "restored",
          message: `Restored ${issue.title}`,
          affectedPaths: getAffectedIssuePaths(issue)
        })));
      }),
      onFixAllIssues: async (issues) => {
        if (!issues.some((issue) => issue.fixAction)) return;
        const decisions = await showConfirmModal(
          this.app,
          issues,
          this.settings.duplicateKeepMode
        );
        if (!decisions) return;
        await this.enqueueOperation(async () => {
          const fixSettings = structuredClone(this.settings);
          const scanProfile = await createScanProfile(fixSettings);
          const batch = await runFixBatch(issues, decisions, {
            scan: () => this.scan(view, structuredClone(fixSettings)),
            execute: (action) => executeFixAction(this.app, action)
          });
          let acceptanceFailed = false;
          let acceptanceError;
          if (batch.verificationResult) {
            try {
              await this.acceptScanResult(
                view,
                batch.verificationResult,
                scanProfile
              );
            } catch (error) {
              acceptanceFailed = true;
              acceptanceError = error;
            }
          }
          if (acceptanceFailed) {
            try {
              view.setOperationOutcomes(batch.outcomes);
            } catch (e) {
              throw acceptanceError;
            }
            throw acceptanceError;
          }
          view.setOperationOutcomes(batch.outcomes);
        });
      },
      onRevealIssue: async (issue) => {
        var _a;
        const path = (_a = issue.primaryPath) != null ? _a : issue.relatedPaths[0];
        if (!path) return;
        const file = this.app.vault.getAbstractFileByPath(path);
        if (file instanceof import_obsidian9.TFile) {
          await view.revealIssue(issue);
        } else {
          new import_obsidian9.Notice(`File not found: ${path}`);
        }
      },
      onRunScan: () => {
        void this.runScan();
      },
      onIgnoreIssue: (issue) => this.enqueueOperation(async () => {
        const candidate = structuredClone(this.settings);
        candidate.ignoredIssueFingerprints = mergeUnique(
          candidate.ignoredIssueFingerprints,
          [issue.fingerprint]
        );
        const affectedPaths = getAffectedIssuePaths(issue);
        try {
          await this.persistPluginData({ settings: candidate });
        } catch (error) {
          view.setOperationOutcomes([{
            fingerprint: issue.fingerprint,
            outcome: "failed",
            message: `Failed to ignore issue: ${errorMessage(error)}`,
            affectedPaths
          }]);
          return;
        }
        this.settings.ignoredIssueFingerprints = mergeUnique(
          this.settings.ignoredIssueFingerprints,
          [issue.fingerprint]
        );
        await this.performScanAndRenderHandled(view);
        view.setOperationOutcomes([{
          fingerprint: issue.fingerprint,
          outcome: "ignored",
          message: `Ignored ${issue.title}`,
          affectedPaths
        }]);
      }),
      onExcludeFolder: (request) => this.enqueueOperation(async () => {
        const candidate = structuredClone(this.settings);
        candidate.ignoredFoldersByScanner[request.scannerId] = mergeUnique(
          candidate.ignoredFoldersByScanner[request.scannerId],
          [request.folder]
        );
        try {
          await this.persistPluginData({ settings: candidate });
        } catch (error) {
          view.setOperationOutcomes([{
            scannerId: request.scannerId,
            outcome: "failed",
            message: `Failed to exclude folder: ${errorMessage(error)}`,
            affectedPaths: [request.folder]
          }]);
          return;
        }
        this.settings.ignoredFoldersByScanner[request.scannerId] = mergeUnique(
          this.settings.ignoredFoldersByScanner[request.scannerId],
          [request.folder]
        );
        await this.performScanAndRenderHandled(view);
        view.setOperationOutcomes([{
          scannerId: request.scannerId,
          outcome: "excluded",
          message: `${SCANNER_LABELS[request.scannerId]} excluded ${request.folder}; ${request.affectedCount} affected finding(s).`,
          affectedPaths: [request.folder]
        }]);
      }),
      onOpenScannerSettings: () => {
        if (openPluginSettings(this.app, this.manifest.id)) return;
        new import_obsidian9.Notice([
          "Open Settings",
          "Vault Inspector",
          "Scanner-specific ignored folders."
        ].join(" \u2192 "));
      }
    });
    view.setEnableFixActions(this.settings.enableFixActions);
  }
  scanAndRender(view) {
    return this.enqueueOperation(async () => {
      view.setOperationOutcomes([]);
      await this.performScanAndRenderHandled(view);
    });
  }
  async performScanAndRenderHandled(view) {
    try {
      await this.performScanAndRender(view);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new import_obsidian9.Notice(`Vault Inspector scan failed: ${message}`);
    }
  }
  enqueueOperation(operation) {
    const run = this.operationQueue.catch(() => void 0).then(operation);
    this.operationQueue = run.catch(() => void 0);
    return run;
  }
  async performScanAndRender(view) {
    const scanSettings = structuredClone(this.settings);
    const scanProfile = await createScanProfile(scanSettings);
    try {
      const result = await this.scan(view, scanSettings);
      if (!result) return;
      await this.acceptScanResult(view, result, scanProfile);
    } catch (error) {
      this.stopScanningBestEffort(view);
      throw error;
    }
  }
  async acceptScanResult(view, result, scanProfile) {
    const comparison = compareScanResult(
      result,
      this.lastSuccessfulSnapshot,
      scanProfile
    );
    view.setResult(result, comparison);
    const nextSnapshot = createScanSnapshot(
      result,
      scanProfile,
      this.manifest.version
    );
    try {
      await this.persistPluginData({ acceptedSnapshot: nextSnapshot });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new import_obsidian9.Notice(
        `Scan completed, but the comparison snapshot could not be saved: ${message}`
      );
    }
  }
  async scan(view, settings) {
    try {
      view.setScanning(true);
      return await this.scanRunner.run(this.app, settings, {
        onProgress: (progress) => view.setScanProgress(progress)
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new import_obsidian9.Notice(`Vault Inspector scan failed: ${message}`);
      this.stopScanningBestEffort(view);
      return null;
    }
  }
  stopScanningBestEffort(view) {
    try {
      view.setScanning(false);
    } catch (e) {
    }
  }
  async exportReport() {
    var _a;
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_INSPECTOR);
    const view = (_a = leaves[0]) == null ? void 0 : _a.view;
    if (!view || !view.hasResult()) {
      new import_obsidian9.Notice("Run a scan first before exporting.");
      return;
    }
    try {
      const result = view.getResult();
      const fullReport = generateMarkdownReport(result);
      const preflight = getReportExportPreflight(fullReport);
      let report = fullReport;
      let exportKind = "Report";
      if (preflight.requiresConfirmation) {
        const decision = await showLargeReportWarningModal(this.app, {
          reportBytes: preflight.byteLength,
          thresholdBytes: MAX_SAFE_VAULT_REPORT_BYTES,
          findingCount: result.issues.length
        });
        if (!decision) return;
        if (decision === "summary") {
          report = generateMarkdownReport(result, "summary");
          exportKind = "Summary";
        }
      }
      const folder = this.settings.reportFolderPath;
      const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const filename = `Vault Inspector ${exportKind} ${timestamp}.md`;
      const filepath = `${folder}/${filename}`;
      if (!this.app.vault.getAbstractFileByPath(folder)) {
        await this.app.vault.createFolder(folder);
      }
      await this.app.vault.create(filepath, report);
      new import_obsidian9.Notice(`${exportKind} exported to ${filepath}`);
    } catch (error) {
      new import_obsidian9.Notice(`Report export failed: ${errorMessage(error)}`);
    }
  }
};
function getAffectedIssuePaths(issue) {
  return [.../* @__PURE__ */ new Set([
    ...issue.primaryPath ? [issue.primaryPath] : [],
    ...issue.relatedPaths
  ])];
}
function uniqueIssuesByFingerprint(issues) {
  const seen = /* @__PURE__ */ new Set();
  return issues.filter((issue) => {
    if (seen.has(issue.fingerprint)) return false;
    seen.add(issue.fingerprint);
    return true;
  });
}
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
function mergeUnique(current, additions) {
  return [.../* @__PURE__ */ new Set([...current, ...additions])];
}
var LEGACY_EXCALIDRAW_KEY = "excalidraw";
var EXCALIDRAW_FRONTMATTER_KEY = "excalidraw-plugin";
function migrateExcalidrawFrontmatterKey(settings, loaded) {
  const loadedKeys = loaded == null ? void 0 : loaded.ignoredLargeMarkdownFrontmatterKeys;
  if (!loadedKeys || !loadedKeys.includes(LEGACY_EXCALIDRAW_KEY)) return false;
  const migrated = settings.ignoredLargeMarkdownFrontmatterKeys.map(
    (k) => k === LEGACY_EXCALIDRAW_KEY ? EXCALIDRAW_FRONTMATTER_KEY : k
  );
  const deduped = Array.from(new Set(migrated));
  if (deduped.length === settings.ignoredLargeMarkdownFrontmatterKeys.length && deduped.every((k, i) => k === settings.ignoredLargeMarkdownFrontmatterKeys[i])) {
    return false;
  }
  settings.ignoredLargeMarkdownFrontmatterKeys = deduped;
  return true;
}

/* nosourcemap */