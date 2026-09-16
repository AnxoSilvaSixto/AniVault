"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all2) => {
  for (var name in all2)
    __defProp(target, name, { get: all2[name], enumerable: true });
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
var SCANNER_RANK = new Map(SCANNER_IDS.map((scannerId, index2) => [scannerId, index2]));
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
  const duration = formatDuration(result.finishedAt - result.startedAt);
  const summary = container.createDiv({ cls: "vi-summary" });
  summary.createEl("h2", { text: "Scan results" });
  renderChanges(summary, result, options);
  const meta = summary.createDiv({ cls: "vi-meta" });
  meta.createSpan({ text: `${result.filesScanned} files scanned` });
  meta.createSpan({ text: duration });
  meta.createSpan({ text: `${result.scannersRun.length} scanners` });
  meta.createSpan({ text: `Ignored ${result.ignoredIssues.length}` });
}
function renderChanges(summary, result, options) {
  const comparison = options.comparison;
  const changes = summary.createDiv({ cls: "vi-changes" });
  if (!comparison.available) {
    renderUnavailableSummary(changes, result, comparison);
    return;
  }
  const newCount = countStatus(result, comparison, "new");
  const persistingCount = countStatus(result, comparison, "persisting");
  const resolvedCount = comparison.resolvedIssues.filter((issue) => !issue.ignored).length;
  const headline = changes.createDiv({ cls: "vi-changes-headline" });
  headline.createSpan({
    cls: "vi-changes-primary",
    text: countPhrase(newCount, "new finding")
  });
  headline.createSpan({
    cls: "vi-changes-resolved",
    text: `${resolvedCount} resolved`
  });
  const onReviewNewFindings = options.onReviewNewFindings;
  if (newCount > 0 && onReviewNewFindings) {
    const review = changes.createEl("button", {
      cls: "vi-review-new-btn mod-cta",
      text: "Review new findings",
      attr: { type: "button" }
    });
    review.addEventListener("click", onReviewNewFindings);
  }
  changes.createDiv({
    cls: "vi-changes-secondary",
    text: `${result.issues.length} active \xB7 ${persistingCount} previously found \xB7 compared with ${formatScanTime(comparison.previousScanAt)}`
  });
}
function renderUnavailableSummary(changes, result, comparison) {
  var _a;
  const reason = (_a = comparison.reason) != null ? _a : "first-scan";
  const headline = changes.createDiv({ cls: "vi-changes-headline" });
  if (reason === "first-scan") {
    headline.createSpan({ cls: "vi-changes-primary", text: "Scan complete" });
    changes.createDiv({
      cls: "vi-changes-secondary",
      text: `${countPhrase(result.issues.length, "active finding")} \xB7 Future scans will highlight what changed.`
    });
    return;
  }
  headline.createSpan({ cls: "vi-changes-primary", text: "Comparison restarted" });
  changes.createDiv({
    cls: "vi-comparison-note",
    text: restartedMessage(reason, comparison.previousScanAt)
  });
}
function countStatus(result, comparison, status) {
  return result.issues.filter(
    (issue) => comparison.statuses.get(issue.fingerprint) === status
  ).length;
}
function countPhrase(count, noun) {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}
function restartedMessage(reason, previousScanAt) {
  const base = reason === "settings-changed" ? "Scan settings changed; this scan is the new baseline." : "Scanner behavior changed; this scan is the new baseline.";
  if (previousScanAt === void 0) return base;
  return `${base} (previous successful scan: ${formatScanTime(previousScanAt)})`;
}
function formatScanTime(ms) {
  return new Date(ms).toLocaleString();
}

// src/fix/fix-eligibility.ts
function resolveEligibility(issue) {
  var _a;
  return (_a = issue.eligibility) != null ? _a : "review-required";
}
var REVIEW_REQUIRED_REASON = "Review this finding before allowing its fix to run.";
function describeEligibility(issue) {
  var _a, _b;
  const action = issue.fixAction;
  if (!action) {
    return {
      status: "No fix available",
      reason: "This finding has no fix action."
    };
  }
  const eligibility = resolveEligibility(issue);
  const status = eligibility === "blocked" ? "Fix unavailable" : eligibility === "review-required" ? "Review before fixing" : "Ready to fix";
  let reason;
  if (issue.classification === "unverified") {
    reason = "The finding could not be verified, so its fix cannot run.";
  } else if (action.kind === "trash-file" && ((_a = issue.impact) == null ? void 0 : _a.coverageComplete) === false) {
    reason = "Some references could not be checked, so files cannot be moved to trash safely.";
  } else if (((_b = action.selection) == null ? void 0 : _b.requiresReview) === true) {
    reason = "Several copies are referenced. Choose which location to keep before continuing.";
  } else if (issue.classification !== "confirmed") {
    reason = REVIEW_REQUIRED_REASON;
  } else if (action.kind === "remove-link-text" && (action.original === void 0 || action.replacement === void 0)) {
    reason = "The replacement text is incomplete, so review is required.";
  } else if (eligibility === "blocked") {
    reason = "This fix cannot run in the current state.";
  } else {
    reason = eligibility === "review-required" ? REVIEW_REQUIRED_REASON : "The fix is confirmed and its evidence is complete.";
  }
  return { status, reason };
}

// src/report/presentation.ts
var CLASSIFICATIONS2 = {
  confirmed: {
    label: "Confirmed",
    className: "vi-classification-confirmed"
  },
  candidate: {
    label: "Needs review",
    className: "vi-classification-candidate"
  },
  unverified: {
    label: "Could not verify",
    className: "vi-classification-unverified"
  }
};
var SEVERITY_LABELS = {
  error: "Errors",
  warning: "Warnings",
  info: "Info"
};
function presentSeverity(severity) {
  return SEVERITY_LABELS[severity];
}
function presentClassification(classification) {
  return CLASSIFICATIONS2[classification];
}
function presentLifecycle(status) {
  return status === "new" ? { label: "New", className: "vi-status-new", showOnCard: true } : {
    label: "Previously found",
    className: "vi-status-persisting",
    showOnCard: false
  };
}
function presentFix(issue) {
  if (!issue.fixAction) return null;
  const eligibility = resolveEligibility(issue);
  const explanation = describeEligibility(issue);
  if (eligibility === "eligible") {
    return {
      actionLabel: "Fix this issue",
      stateLabel: null,
      reason: null,
      className: "vi-fix-ready"
    };
  }
  if (eligibility === "review-required") {
    return {
      actionLabel: "Review fix",
      stateLabel: explanation.status,
      reason: explanation.reason,
      className: "vi-fix-review"
    };
  }
  return {
    actionLabel: null,
    stateLabel: explanation.status,
    reason: explanation.reason,
    className: "vi-fix-unavailable"
  };
}

// src/report/render-evidence.ts
function renderFindingEvidence(container, issue) {
  var _a;
  const classification = presentClassification(issue.classification);
  container.createSpan({
    cls: `vi-classification-badge ${classification.className}`,
    text: classification.label
  });
  const explanation = container.createDiv({ cls: "vi-explanation" });
  renderRow(explanation, "Why", issue.explanation.why);
  if ((_a = issue.explanation.caveat) == null ? void 0 : _a.trim()) {
    renderRow(explanation, "Keep in mind", issue.explanation.caveat);
  }
  renderRow(explanation, "Recommended next step", issue.explanation.nextStep);
  const disclosure = container.createEl("details", {
    cls: "vi-evidence-disclosure"
  });
  disclosure.addEventListener("click", (event) => event.stopPropagation());
  disclosure.createEl("summary", { text: "Technical evidence" });
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
  const escaped2 = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*\//g, globstarSlashPlaceholder).replace(/\*\*/g, globstarPlaceholder).replace(/\*/g, "[^/]*");
  const pattern = escaped2.split(globstarSlashPlaceholder).join("(?:.*/)?").split(globstarPlaceholder).join(".*");
  return new RegExp(`^${pattern}$`).test(path);
}

// src/report/render-issues.ts
function selectBulkFixable(selected) {
  const bulk = [];
  let reviewRequired = 0;
  let blocked = 0;
  for (const issue of selected) {
    if (!issue.fixAction) continue;
    const eligibility = resolveEligibility(issue);
    if (eligibility === "eligible") bulk.push(issue);
    else if (eligibility === "blocked") blocked += 1;
    else reviewRequired += 1;
  }
  return { bulk, reviewRequired, blocked };
}
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
    const list2 = section.createEl("ul", { cls: "vi-issue-list" });
    for (const issue of scannerIssues) {
      const isSelected = config.selectedFingerprints.has(issue.fingerprint);
      const cls = [
        "vi-issue",
        `vi-severity-${issue.severity}`,
        config.selectionMode ? "vi-selectable" : "",
        isSelected ? "vi-selected" : ""
      ].filter(Boolean).join(" ");
      const li = list2.createEl("li", { cls });
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
        const presentation = presentLifecycle(status);
        if (presentation.showOnCard) {
          li.createSpan({
            cls: `vi-status-badge ${presentation.className}`,
            text: presentation.label
          });
        }
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
  const fix = presentFix(issue);
  if (fix == null ? void 0 : fix.stateLabel) {
    const state = details.createDiv({ cls: `vi-fix-state ${fix.className}` });
    state.createSpan({ cls: "vi-fix-state-label", text: fix.stateLabel });
    if (fix.reason) {
      state.createSpan({ cls: "vi-fix-state-reason", text: fix.reason });
    }
  }
  renderFindingEvidence(details, issue);
  renderIssueActions(details, issue, config, fix);
}
function renderIssueActions(container, issue, config, fix) {
  var _a;
  const issuePath2 = getIssuePath(issue);
  const actionLabel = (_a = fix == null ? void 0 : fix.actionLabel) != null ? _a : null;
  const canFixIssue = actionLabel !== null && config.onFixIssue !== void 0;
  const canExcludeFolder = Boolean(
    config.onExcludeFolder && issuePath2 && getParentFolder(issuePath2)
  );
  if (!canFixIssue && !config.onIgnoreIssue && !canExcludeFolder && !config.onOpenScannerSettings) {
    return;
  }
  const disclosure = container.createEl("details", { cls: "vi-actions-disclosure" });
  disclosure.addEventListener("click", (event) => event.stopPropagation());
  disclosure.createEl("summary", { text: "Actions" });
  const actions = disclosure.createDiv({ cls: "vi-context-actions" });
  if (canFixIssue) {
    createActionButton(
      actions,
      actionLabel,
      () => {
        var _a2;
        void ((_a2 = config.onFixIssue) == null ? void 0 : _a2.call(config, issue));
      }
    );
  }
  if (config.onIgnoreIssue) {
    createActionButton(actions, "Ignore this issue", () => {
      var _a2;
      (_a2 = config.onIgnoreIssue) == null ? void 0 : _a2.call(config, issue);
    });
  }
  if (canExcludeFolder) {
    createActionButton(actions, "Exclude parent folder", () => {
      var _a2;
      (_a2 = config.onExcludeFolder) == null ? void 0 : _a2.call(config, issue);
    });
  }
  if (config.onOpenScannerSettings) {
    createActionButton(actions, "Scanner settings", () => {
      var _a2;
      (_a2 = config.onOpenScannerSettings) == null ? void 0 : _a2.call(config, issue.scannerId);
    });
  }
}
function createActionButton(container, text3, onClick) {
  container.createEl("button", {
    cls: "vi-action-btn",
    text: text3,
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
    const paths = issue.relatedPaths;
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
function describeOutcomeLabel(outcome) {
  if (outcome.outcome === "failed" && "phase" in outcome) {
    if (outcome.phase === "verification") return "Verification failed";
    if (outcome.phase === "execution") return "Execution failed";
  }
  return OUTCOME_LABELS[outcome.outcome];
}
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
  const list2 = details.createEl("ul", { cls: "vi-outcomes-list" });
  for (const outcome of outcomes) {
    const item = list2.createEl("li", { cls: "vi-outcome-item" });
    item.createSpan({
      cls: `vi-outcome-label vi-outcome-${outcome.outcome}`,
      text: describeOutcomeLabel(outcome)
    });
    item.createDiv({ cls: "vi-outcome-message", text: outcome.message });
    if ("phase" in outcome && outcome.phase && outcome.outcome !== "failed") {
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

// src/report/render-controls.ts
function activeFilterCount(filters) {
  return [
    filters.scanner,
    filters.severity,
    filters.status,
    filters.classification
  ].filter((value) => value !== null).length;
}
function renderReportControls(container, config) {
  var _a;
  const active = activeFilterCount(config.filters);
  const details = container.createEl("details", {
    cls: "vi-controls-disclosure"
  });
  details.open = config.expanded || active > 0 || config.selectionMode;
  details.addEventListener("toggle", () => {
    config.onExpandedChange(details.open);
  });
  const summary = details.createEl("summary", {
    text: active > 0 ? `Filter and select \xB7 ${active} active` : "Filter and select"
  });
  summary.setAttr("aria-label", active > 0 ? `Filter and select, ${active} active filters` : "Filter and select");
  const body = details.createDiv({ cls: "vi-controls-body" });
  const update = (patch) => {
    config.onFiltersChange({ ...config.filters, ...patch });
  };
  const scanners = body.createDiv({ cls: "vi-filter-group" });
  createFilterButton(scanners, "All scanners", config.filters.scanner === null, () => {
    update({ scanner: null });
  });
  for (const scannerId of config.result.scannersRun) {
    const count = (_a = config.filterView.scannerCounts.get(scannerId)) != null ? _a : 0;
    createFilterButton(
      scanners,
      `${SCANNER_LABELS[scannerId]} (${count})`,
      config.filters.scanner === scannerId,
      () => update({
        scanner: config.filters.scanner === scannerId ? null : scannerId
      })
    );
  }
  const severities = body.createDiv({ cls: "vi-filter-group" });
  for (const { severity, count } of config.filterView.severityFacets) {
    createFilterButton(
      severities,
      `${presentSeverity(severity)} (${count})`,
      config.filters.severity === severity,
      () => update({
        severity: config.filters.severity === severity ? null : severity
      })
    );
  }
  if (config.comparisonAvailable) {
    const lifecycle = body.createDiv({ cls: "vi-filter-group" });
    for (const { status, count } of config.filterView.statusFacets) {
      createFilterButton(
        lifecycle,
        `${presentLifecycle(status).label} (${count})`,
        config.filters.status === status,
        () => update({
          status: config.filters.status === status ? null : status
        })
      );
    }
  }
  const classifications = body.createDiv({ cls: "vi-filter-group" });
  for (const { classification, count } of config.filterView.classificationFacets) {
    createFilterButton(
      classifications,
      `${presentClassification(classification).label} (${count})`,
      config.filters.classification === classification,
      () => update({
        classification: config.filters.classification === classification ? null : classification
      })
    );
  }
  const actions = body.createDiv({ cls: "vi-controls-actions" });
  const select = actions.createEl("button", {
    cls: `vi-filter-btn${config.selectionMode ? " vi-active" : ""}`,
    text: config.selectionMode ? "Done selecting" : "Select findings",
    attr: { type: "button" }
  });
  select.addEventListener("click", () => {
    config.onSelectionModeChange(!config.selectionMode);
  });
  if (active > 0) {
    const clear = actions.createEl("button", {
      cls: "vi-filter-btn",
      text: "Clear filters",
      attr: { type: "button" }
    });
    clear.addEventListener("click", () => {
      config.onFiltersChange({
        scanner: null,
        severity: null,
        status: null,
        classification: null
      });
    });
  }
  return details;
}
function createFilterButton(container, text3, active, onClick) {
  const button = container.createEl("button", {
    cls: `vi-filter-btn${active ? " vi-active" : ""}`,
    text: text3,
    attr: { type: "button", "aria-pressed": String(active) }
  });
  button.addEventListener("click", onClick);
}

// src/report/InspectorView.ts
var import_obsidian5 = require("obsidian");

// src/fix/confirm-modal.ts
var import_obsidian2 = require("obsidian");

// src/fix/fix-decisions.ts
function isBlockedFromExecution(issue) {
  return issue.fixAction !== void 0 && issue.eligibility === "blocked";
}
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
    const keepPath = mode === "automatic" && !selection.requiresReview ? selection.automaticKeepPath : selectedKeeps.get(issue.fingerprint);
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
  var _a, _b;
  const requested = requestedIssue.fixAction;
  const fresh = freshIssue == null ? void 0 : freshIssue.fixAction;
  if (decision.fingerprint !== requestedIssue.fingerprint || (freshIssue == null ? void 0 : freshIssue.fingerprint) !== requestedIssue.fingerprint || !requested || !fresh || isBlockedFromExecution(freshIssue)) {
    return null;
  }
  if (requested.selection || fresh.selection) {
    if (!requested.selection || !fresh.selection || requested.kind !== fresh.kind || requested.label !== fresh.label || requested.selection.requiresReview !== fresh.selection.requiresReview || requested.selection.automaticKeepPath !== fresh.selection.automaticKeepPath || !samePaths(
      (_a = requested.selection.referencedPaths) != null ? _a : [],
      (_b = fresh.selection.referencedPaths) != null ? _b : []
    ) || !samePaths(
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
  return sortedLeft.length === sortedRight.length && sortedRight.every((path, index2) => path === sortedLeft[index2]);
}
function fixActionsMatch(left, right) {
  return left.kind === right.kind && left.label === right.label && left.description === right.description && left.linkText === right.linkText && left.targetPaths.length === right.targetPaths.length && left.targetPaths.every(
    (path, index2) => path === right.targetPaths[index2]
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
function confirmButtonLabel(actions) {
  if (actions.length !== 1) return "Apply selected fixes";
  return actions[0].kind === "trash-file" ? "Move to trash" : "Apply fix";
}
function describeActionConsequence(action) {
  return action.kind === "trash-file" ? "Move file to trash" : "Modify note";
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
function shouldAskForKeep(mode, selection) {
  return mode === "always-ask" || selection.requiresReview === true;
}
function groupByEligibility(issues) {
  const groups = {
    eligible: [],
    reviewRequired: [],
    blocked: []
  };
  for (const issue of issues) {
    if (!issue.fixAction) continue;
    const eligibility = resolveEligibility(issue);
    if (eligibility === "eligible") groups.eligible.push(issue);
    else if (eligibility === "blocked") groups.blocked.push(issue);
    else groups.reviewRequired.push(issue);
  }
  return groups;
}
function isReviewApproved(issue, mode, selectedKeeps, approvedReviews) {
  var _a;
  const selection = (_a = issue.fixAction) == null ? void 0 : _a.selection;
  if (selection && shouldAskForKeep(mode, selection)) {
    const keepPath = selectedKeeps.get(issue.fingerprint);
    return keepPath !== void 0 && selection.candidatePaths.includes(keepPath);
  }
  return approvedReviews.has(issue.fingerprint);
}
function buildConfirmationPlan(issues, mode, selectedKeeps, approvedReviews) {
  const groups = groupByEligibility(issues);
  const actionable = [
    ...groups.eligible,
    ...groups.reviewRequired.filter((issue) => isReviewApproved(issue, mode, selectedKeeps, approvedReviews))
  ];
  const state = buildFixDecisionState(actionable, mode, selectedKeeps);
  return {
    groups,
    actionable,
    complete: actionable.length > 0 && state.complete
  };
}
function buildImpactRows(paths, stats) {
  return paths.map((path) => {
    const stat = stats.get(path);
    return {
      path,
      size: stat ? formatSize(stat.size) : "Size unknown",
      mtime: stat ? new Date(stat.mtime).toLocaleDateString() : "Modified date unknown"
    };
  });
}
var ConfirmFixModal = class extends import_obsidian2.Modal {
  constructor(app, issues, mode, resolve) {
    super(app);
    this.selectedKeeps = /* @__PURE__ */ new Map();
    this.approvedReviews = /* @__PURE__ */ new Set();
    this.referenceDetailsOpen = false;
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
  collectStats(paths) {
    const stats = /* @__PURE__ */ new Map();
    for (const path of paths) {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (file instanceof import_obsidian2.TFile) {
        stats.set(path, { size: file.stat.size, mtime: file.stat.mtime });
      }
    }
    return stats;
  }
  renderContent() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("vi-confirm-modal");
    const plan = buildConfirmationPlan(
      this.issues,
      this.mode,
      this.selectedKeeps,
      this.approvedReviews
    );
    const state = buildFixDecisionState(
      plan.actionable,
      this.mode,
      this.selectedKeeps
    );
    const actions = plan.actionable.flatMap((issue) => {
      const decision = state.decisions.find(
        (candidate) => candidate.fingerprint === issue.fingerprint
      );
      if (!decision) return [];
      const action = resolveDecisionAction(issue, decision);
      return action ? [action] : [];
    });
    const summary = summarizeFixActions(actions);
    const decisionSentence = actions.length === 1 ? describeFixActions(actions) : summary.description;
    contentEl.createEl("h3", { text: summary.title });
    contentEl.createEl("p", {
      text: plan.complete ? decisionSentence : "Approve at least one fix and choose one file to keep in every duplicate group."
    });
    const stats = this.collectStats([
      ...new Set(
        this.issues.flatMap((issue) => {
          var _a, _b;
          return (_b = (_a = issue.fixAction) == null ? void 0 : _a.targetPaths) != null ? _b : [];
        })
      )
    ]);
    for (const issue of this.issues) {
      this.renderImpactCard(contentEl, issue, stats);
    }
    const btnRow = contentEl.createDiv({ cls: "vi-confirm-buttons" });
    btnRow.createEl("button", { text: "Cancel" }).addEventListener("click", () => this.finish(null));
    const confirmBtn = btnRow.createEl("button", {
      cls: "vi-confirm-destructive",
      text: confirmButtonLabel(actions)
    });
    confirmBtn.disabled = !plan.complete;
    confirmBtn.addEventListener("click", () => {
      if (plan.complete) this.finish(state.decisions);
    });
  }
  renderImpactCard(container, issue, stats) {
    var _a, _b;
    const action = issue.fixAction;
    if (!action) return;
    const eligibility = resolveEligibility(issue);
    const explanation = describeEligibility(issue);
    const approved = eligibility === "eligible" || isReviewApproved(
      issue,
      this.mode,
      this.selectedKeeps,
      this.approvedReviews
    );
    const card = container.createDiv({
      cls: eligibility === "review-required" && !approved ? "vi-impact-card vi-impact-card-muted" : "vi-impact-card"
    });
    const titleRow = card.createDiv({ cls: "vi-impact-card-title-row" });
    titleRow.createSpan({ cls: "vi-impact-card-title", text: issue.title });
    titleRow.createSpan({
      cls: `vi-eligibility-badge vi-eligibility-${eligibility}`,
      text: explanation.status
    });
    card.createDiv({ cls: "vi-impact-reason", text: explanation.reason });
    card.createDiv({
      cls: "vi-impact-consequence",
      text: describeActionConsequence(action)
    });
    const rows = card.createDiv({ cls: "vi-impact-rows" });
    for (const row of buildImpactRows(action.targetPaths, stats)) {
      const rowEl = rows.createDiv({ cls: "vi-impact-row" });
      rowEl.createSpan({
        cls: "vi-impact-row-path",
        text: row.path
      });
      rowEl.createSpan({
        cls: "vi-impact-row-meta",
        text: `${row.size} \xB7 modified ${row.mtime}`
      });
    }
    if (issue.impact) {
      const referenceDetails = card.createEl("details", {
        cls: "vi-impact-reference-details"
      });
      referenceDetails.open = this.referenceDetailsOpen;
      referenceDetails.addEventListener("toggle", () => {
        this.referenceDetailsOpen = referenceDetails.open;
      });
      referenceDetails.createEl("summary", { text: "Reference details" });
      referenceDetails.createDiv({
        text: `Inbound references: ${issue.impact.inboundReferences}`
      });
      referenceDetails.createDiv({
        text: `Coverage: ${issue.impact.coverageComplete ? "Complete" : "Incomplete"}`
      });
    }
    const selection = action.selection;
    if (selection) {
      const keepPath = (_a = this.selectedKeeps.get(issue.fingerprint)) != null ? _a : selection.automaticKeepPath;
      card.createDiv({ cls: "vi-impact-keep", text: `Keep: ${keepPath}` });
    }
    if (selection && shouldAskForKeep(this.mode, selection)) {
      const group = card.createDiv({ cls: "vi-keep-group" });
      group.createDiv({
        cls: "vi-keep-group-title",
        text: "Choose one file to keep"
      });
      const referencedPaths = (_b = selection.referencedPaths) != null ? _b : [];
      if (referencedPaths.length >= 2) {
        group.createDiv({
          cls: "vi-keep-group-impact",
          text: `${referencedPaths.length} of ${selection.candidatePaths.length} files are referenced by notes: ${referencedPaths.join(", ")}. Choose which location to keep \u2014 references are never rewritten.`
        });
      }
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
    if (eligibility === "review-required" && !selection) {
      const label = card.createEl("label", { cls: "vi-review-checkbox" });
      const checkbox = label.createEl("input", { type: "checkbox" });
      checkbox.checked = this.approvedReviews.has(issue.fingerprint);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          this.approvedReviews.add(issue.fingerprint);
        } else {
          this.approvedReviews.delete(issue.fingerprint);
        }
        this.renderContent();
      });
      label.createSpan({ text: "I reviewed this file" });
    }
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
function findFirstTextPosition(content3, targets) {
  for (const target of targets) {
    const position2 = findTextPosition(content3, target);
    if (position2) return position2;
  }
  return null;
}
function findTextPosition(content3, target) {
  const index2 = content3.indexOf(target);
  if (index2 === -1) return null;
  const before = content3.slice(0, index2);
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
      controlsExpanded: false,
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
    this.model.controlsExpanded = activeFilterCount(this.currentFilters()) > 0;
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
    renderSummary(container, this.model.result, {
      comparison: this.model.comparison,
      onReviewNewFindings: () => {
        this.model.filterStatus = "new";
        this.model.filterScanner = null;
        this.model.filterSeverity = null;
        this.model.filterClassification = null;
        this.render();
      }
    });
    this.renderControls(container, filterView);
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
      },
      ...this.model.enableFixActions ? {
        onFixIssue: (issue) => this.handleBatchAction(
          this.onFixAllIssues,
          [issue],
          "Fixing issue"
        )
      } : {}
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
  // ─── Controls ────────────────────────────────────────────
  renderControls(container, filterView) {
    if (!this.model.result) return;
    renderReportControls(container, {
      result: this.model.result,
      filterView,
      filters: this.currentFilters(),
      comparisonAvailable: this.model.comparison.available,
      expanded: this.model.controlsExpanded,
      selectionMode: this.model.selectionMode,
      onExpandedChange: (expanded) => {
        this.model.controlsExpanded = expanded;
      },
      onFiltersChange: (filters) => {
        this.model.filterScanner = filters.scanner;
        this.model.filterSeverity = filters.severity;
        this.model.filterStatus = filters.status;
        this.model.filterClassification = filters.classification;
        this.render();
      },
      onSelectionModeChange: (selectionMode) => {
        this.model.selectionMode = selectionMode;
        this.model.controlsExpanded = selectionMode || this.model.controlsExpanded;
        if (!selectionMode) this.model.selectedFingerprints = /* @__PURE__ */ new Set();
        this.render();
      }
    });
  }
  // ─── Main Action Bar ─────────────────────────────────────
  renderMainActionBar(container) {
    if (!this.model.result) return;
    const visibleIssues = this.getVisibleIssues();
    const selectedIssues = visibleIssues.filter((i) => this.model.selectedFingerprints.has(i.fingerprint));
    const bulkSelection = selectBulkFixable(selectedIssues);
    const selectedFixable = bulkSelection.bulk;
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
    if (this.model.enableFixActions) {
      const excluded = bulkSelection.reviewRequired + bulkSelection.blocked;
      if (excluded > 0) {
        const note = right.createSpan({
          cls: "vi-bulk-excluded-note",
          text: `${excluded} ${excluded === 1 ? "needs" : "need"} review`
        });
        (0, import_obsidian4.setTooltip)(
          note,
          "Review-required and blocked findings are excluded from this batch. Fix them one at a time."
        );
      }
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
    return buildIssueFilterView(
      (_b = (_a = this.model.result) == null ? void 0 : _a.issues) != null ? _b : [],
      this.currentFilters(),
      this.model.comparison.statuses
    );
  }
  currentFilters() {
    return {
      scanner: this.model.filterScanner,
      severity: this.model.filterSeverity,
      status: this.model.filterStatus,
      classification: this.model.filterClassification
    };
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
    const content3 = await this.app.vault.cachedRead(file);
    const position2 = findFirstTextPosition(content3, targets);
    if (!position2) return;
    const view = this.app.workspace.getActiveViewOfType(import_obsidian4.MarkdownView);
    const editor = view == null ? void 0 : view.editor;
    if (!editor) return;
    editor.setCursor(position2);
    editor.scrollIntoView({ from: position2, to: position2 }, true);
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

// src/utils/vault-links.ts
var indexCache = /* @__PURE__ */ new WeakMap();
function getLinkTarget(linkText) {
  return normalizePath(linkText.split("|")[0].split("#")[0].trim());
}
function resolveVaultLinkTargets(ctx, linkText, sourcePath) {
  var _a, _b;
  const target = getLinkTarget(linkText);
  if (!target || hasUriScheme(target)) return [];
  const extension2 = getExtension(target);
  const relativeTarget = sourcePath && /^\.{1,2}\//.test(target) ? resolveRelativePath(sourcePath, target) : null;
  const sourceFolderTarget = sourcePath && !target.includes("/") ? resolveRelativePath(sourcePath, `./${target}`) : null;
  const candidateTargets = relativeTarget ? [relativeTarget] : sourceFolderTarget ? [sourceFolderTarget, target] : [target];
  const exactCandidates = candidateTargets.flatMap(
    (candidate) => extension2 ? [candidate] : [candidate, `${candidate}.md`]
  );
  for (const candidate of exactCandidates) {
    if (ctx.filePathIndex.has(candidate)) return [candidate];
  }
  if (target.includes("/")) return [];
  const indexes = getLinkIndexes(ctx);
  if (extension2) {
    return ((_a = indexes.fileNameToPaths.get(target)) != null ? _a : []).slice(0, 1);
  }
  return ((_b = indexes.markdownBaseToPaths.get(target)) != null ? _b : []).slice(0, 1);
}
function hasUriScheme(text3) {
  return /^[a-z][a-z\d+.-]*:/i.test(text3);
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

// src/scanner/reference-index.ts
function getInboundReference(index2, path) {
  return index2.inboundByPath.get(path);
}
function isReferenced(index2, path) {
  return index2.inboundByPath.has(path);
}
async function buildReferenceIndex(ctx) {
  var _a, _b, _c;
  const mutableInboundByPath = /* @__PURE__ */ new Map();
  const coverageFailures = [];
  const canvasFiles = [];
  const addReference = (targetPath, sourcePath, kind) => {
    var _a2;
    const entry = (_a2 = mutableInboundByPath.get(targetPath)) != null ? _a2 : {
      count: 0,
      kinds: /* @__PURE__ */ new Set(),
      sources: /* @__PURE__ */ new Set()
    };
    entry.count += 1;
    entry.kinds.add(kind);
    entry.sources.add(sourcePath);
    mutableInboundByPath.set(targetPath, entry);
  };
  const resolveTarget = (link, sourcePath) => {
    var _a2, _b2, _c2;
    if (!link || hasUriScheme(link)) return null;
    const linkPath = link.split("#", 1)[0];
    if (!linkPath) return sourcePath;
    if (typeof ctx.metadataCache.getFirstLinkpathDest === "function") {
      return (_b2 = (_a2 = ctx.metadataCache.getFirstLinkpathDest(linkPath, sourcePath)) == null ? void 0 : _a2.path) != null ? _b2 : null;
    }
    return (_c2 = resolveVaultLinkTargets(ctx, link, sourcePath)[0]) != null ? _c2 : null;
  };
  const resolveReference = (reference, sourcePath) => reference.destination ? reference.destination.resolvedPath : resolveTarget(reference.link, sourcePath);
  for (const file of ctx.markdownFiles) {
    const cache = ctx.metadataCache.getFileCache(file);
    if (!cache) {
      coverageFailures.push({
        path: file.path,
        reason: "metadata-cache-missing"
      });
      continue;
    }
    for (const link of (_a = cache.links) != null ? _a : []) {
      const resolved = resolveReference(link, file.path);
      if (resolved) addReference(resolved, file.path, "note-link");
    }
    for (const embed of (_b = cache.embeds) != null ? _b : []) {
      const resolved = resolveReference(embed, file.path);
      if (resolved) addReference(resolved, file.path, "embed");
    }
    for (const link of (_c = cache.frontmatterLinks) != null ? _c : []) {
      const resolved = resolveReference(link, file.path);
      if (resolved) addReference(resolved, file.path, "frontmatter");
    }
  }
  for (const file of ctx.allFiles) {
    if (file.extension !== "canvas") continue;
    canvasFiles.push(file.path);
    let content3;
    try {
      content3 = await ctx.vault.cachedRead(file);
    } catch (error) {
      coverageFailures.push({
        path: file.path,
        reason: "read-failed",
        detail: error instanceof Error ? error.message : String(error)
      });
      continue;
    }
    let parsed;
    try {
      parsed = JSON.parse(content3);
    } catch (error) {
      coverageFailures.push({
        path: file.path,
        reason: "malformed-json",
        detail: error instanceof Error ? error.message : String(error)
      });
      continue;
    }
    const nodes = isCanvasDocument(parsed) ? parsed.nodes : null;
    if (nodes === null) {
      coverageFailures.push({ path: file.path, reason: "unexpected-shape" });
      continue;
    }
    for (const node2 of nodes) {
      const canvasNode = node2;
      if (canvasNode === null) continue;
      const target = canvasNode.type === "file" ? canvasNode.file : canvasNode.type === "group" ? canvasNode.background : void 0;
      if (typeof target !== "string" || target === "") continue;
      const resolved = resolveTarget(target, file.path);
      if (resolved) addReference(resolved, file.path, "canvas");
    }
  }
  const inboundByPath = /* @__PURE__ */ new Map();
  for (const [path, entry] of mutableInboundByPath) {
    inboundByPath.set(path, {
      count: entry.count,
      kinds: [...entry.kinds].sort(),
      sources: [...entry.sources].sort()
    });
  }
  return {
    inboundByPath,
    canvasFiles,
    coverageFailures,
    coverageComplete: coverageFailures.length === 0
  };
}
function isCanvasDocument(value) {
  return typeof value === "object" && value !== null && Array.isArray(value.nodes);
}

// src/fix/action-policy.ts
function deriveActionPolicy(issue, index2) {
  const action = issue.fixAction;
  if (!action) return null;
  const impact = computeImpact(action, index2);
  let eligibility;
  if (issue.classification === "unverified") {
    eligibility = "blocked";
  } else if (action.kind === "trash-file" && !impact.coverageComplete) {
    eligibility = "blocked";
  } else if (issue.classification !== "confirmed") {
    eligibility = "review-required";
  } else if (!actionEvidenceComplete(action)) {
    eligibility = "review-required";
  } else {
    eligibility = "eligible";
  }
  return { eligibility, impact };
}
function withActionPolicy(issue, index2) {
  const policy = deriveActionPolicy(issue, index2);
  if (!policy) return issue;
  return {
    ...issue,
    eligibility: policy.eligibility,
    impact: policy.impact
  };
}
function actionEvidenceComplete(action) {
  var _a;
  if (action.kind === "remove-link-text") {
    return action.original !== void 0 && action.replacement !== void 0;
  }
  return ((_a = action.selection) == null ? void 0 : _a.requiresReview) !== true;
}
function computeImpact(action, index2) {
  const trashing = action.kind === "trash-file";
  const inboundReferences = action.targetPaths.reduce(
    (total, path) => {
      var _a, _b;
      return total + ((_b = (_a = getInboundReference(index2, path)) == null ? void 0 : _a.count) != null ? _b : 0);
    },
    0
  );
  return {
    filesChanged: trashing ? 0 : action.targetPaths.length,
    filesTrashed: trashing ? action.targetPaths.length : 0,
    inboundReferences,
    coverageComplete: index2.coverageComplete
  };
}

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
    const referenceIndex = await buildReferenceIndex({
      metadataCache: app.metadataCache,
      vault: app.vault,
      markdownFiles,
      allFiles,
      filePathIndex
    });
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
      emptyNoteWordThreshold: settings.emptyNoteWordThreshold,
      referenceIndex
    };
    const scannersRun = [];
    const issues = [];
    const ignoredIssues = [];
    for (let index2 = 0; index2 < this.scanners.length; index2++) {
      const scanner = this.scanners[index2];
      const scannerIndex = index2 + 1;
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
        const annotated = withActionPolicy(issue, referenceIndex);
        if (ctx.ignoredFingerprints.has(annotated.fingerprint)) {
          ignoredIssues.push(annotated);
        } else {
          issues.push(annotated);
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
        const destination = candidate.destination;
        const key = destination ? JSON.stringify([candidate.linkText, destination.path, destination.fragment, destination.resolvedPath]) : candidate.linkText;
        const existing = linkCandidates.get(key);
        if (!existing) {
          linkCandidates.set(key, candidate);
          return;
        }
        linkCandidates.set(key, {
          linkText: candidate.linkText,
          destination: candidate.destination,
          fixLinkText: (_a2 = existing.fixLinkText) != null ? _a2 : candidate.fixLinkText,
          // A fix targets one exact source range. When merged references
          // disagree on the original syntax (plain vs aliased, wiki vs
          // markdown, embed vs non-embed) or one of them has no original,
          // a single action cannot cover every occurrence — withhold it
          // and keep the finding reviewable.
          fix: existing.fix && candidate.fix && existing.fix.original === candidate.fix.original ? existing.fix : void 0,
          isEmbed: existing.isEmbed || candidate.isEmbed,
          isMarkdown: existing.isMarkdown || candidate.isMarkdown,
          ignorableUnresolvedNote: existing.ignorableUnresolvedNote && candidate.ignorableUnresolvedNote
        });
      };
      for (const unresolvedLink of Object.keys(linksForFile != null ? linksForFile : {})) {
        const matchingReferences = references.filter(
          ({ reference }) => reference.link === unresolvedLink
        );
        if (matchingReferences.length === 0) {
          addCandidate({
            linkText: unresolvedLink,
            isEmbed: false,
            isMarkdown: false,
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
        issues.push(...resolveLinkIssues(ctx, file.path, candidate));
      }
    }
    return issues;
  }
};
function resolveLinkIssues(ctx, sourcePath, candidate) {
  var _a, _b, _c;
  const issues = [];
  const linkText = candidate.linkText;
  const destination = candidate.destination;
  const rawTarget = destination ? destination.path : getLinkTarget(linkText);
  const linkDestination = linkText.split("|")[0];
  const headingPart = destination ? destination.fragment : linkDestination.includes("#") ? linkDestination.split("#").slice(1).join("#") : null;
  const sameNote = rawTarget === "" && Boolean(headingPart);
  if (!rawTarget && !sameNote || hasUriScheme(rawTarget)) return issues;
  if (isAttachmentLink(rawTarget)) {
    if (!(destination ? destination.resolvedPath : findResolvedPath(ctx, rawTarget, sourcePath))) {
      issues.push(
        makeIssue(
          sourcePath,
          candidate,
          rawTarget,
          "error",
          `Attachment not found: ${rawTarget}`,
          candidate.isEmbed ? "embed" : "attachment"
        )
      );
    }
    return issues;
  }
  const resolvedPath = destination ? ((_a = destination.resolvedPath) == null ? void 0 : _a.endsWith(".md")) ? destination.resolvedPath : null : sameNote ? sourcePath : findMarkdownPath(ctx, rawTarget, sourcePath);
  if (!resolvedPath) {
    if (ctx.ignoreUnresolvedNoteLinks && candidate.ignorableUnresolvedNote) {
      return issues;
    }
    issues.push(
      makeIssue(
        sourcePath,
        candidate,
        rawTarget,
        "error",
        `Linked file not found: ${rawTarget}`,
        candidate.isEmbed ? "embed" : candidate.isMarkdown ? "markdown-link" : "note-link"
      )
    );
    return issues;
  }
  if (headingPart) {
    const targetCache = ctx.metadataCache.getFileCache(
      ctx.markdownFiles.find((file) => file.path === resolvedPath)
    );
    const isBlock = headingPart.startsWith("^");
    const found = isBlock ? Object.keys((_b = targetCache == null ? void 0 : targetCache.blocks) != null ? _b : {}).some(
      (id) => id.toLowerCase() === headingPart.slice(1).toLowerCase()
    ) : ((_c = targetCache == null ? void 0 : targetCache.headings) != null ? _c : []).some(
      (heading) => slugifyHeading(heading.heading) === slugifyHeading(headingPart)
    );
    if (!found) {
      issues.push(
        makeIssue(
          sourcePath,
          candidate,
          resolvedPath,
          "warning",
          `${isBlock ? "Block" : "Heading"} "#${headingPart}" not found in ${resolvedPath}`,
          candidate.isEmbed ? "embed" : candidate.isMarkdown ? "markdown-link" : "heading",
          isBlock ? "block" : "heading"
        )
      );
    }
  }
  return issues;
}
function getLinkCandidate({ reference, isEmbed }) {
  var _a;
  const original = (_a = reference.original) != null ? _a : "";
  const wikiMatch = original.match(/^(!?)\[\[([\s\S]+)\]\]$/);
  if (wikiMatch) {
    const inner = wikiMatch[2];
    return {
      // Obsidian's LinkCache.link already strips the alias, so the candidate
      // key must use it — the full inner text survives only as fix text.
      linkText: reference.link,
      destination: reference.destination,
      fixLinkText: inner,
      fix: {
        original,
        // Embeds render their target, not their text: removal is the
        // only faithful transform.
        replacement: wikiMatch[1] ? "" : deriveWikiReplacement(inner)
      },
      isEmbed,
      isMarkdown: false,
      ignorableUnresolvedNote: !isEmbed && !wikiMatch[1]
    };
  }
  const markdownMatch = original.match(/^(!?)\[([^\]]*)\]\(\s*(?:<[^>]+>|[^)\s]*)\s*\)$/);
  if (markdownMatch) {
    return {
      linkText: reference.link,
      destination: reference.destination,
      fix: {
        original,
        replacement: markdownMatch[1] ? "" : markdownMatch[2]
      },
      isEmbed: Boolean(markdownMatch[1]),
      isMarkdown: true,
      ignorableUnresolvedNote: false
    };
  }
  return {
    linkText: reference.link,
    destination: reference.destination,
    isEmbed,
    isMarkdown: !isEmbed && original.startsWith("["),
    ignorableUnresolvedNote: false
  };
}
function deriveWikiReplacement(inner) {
  const pipeIndex = inner.indexOf("|");
  return pipeIndex === -1 ? inner : inner.slice(pipeIndex + 1);
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
function makeIssue(sourcePath, candidate, targetPath, severity, message, linkKind, referenceKind = "heading") {
  var _a;
  const fragmentAt = candidate.linkText.indexOf("#");
  const rawFragment = fragmentAt === -1 ? null : candidate.linkText.slice(fragmentAt + 1);
  const resolvedFragment = (_a = candidate.destination) == null ? void 0 : _a.fragment;
  const fragmentIdentity = resolvedFragment != null && resolvedFragment !== rawFragment ? { resolvedFragment } : {};
  const issue = {
    scannerId: "broken-links",
    severity,
    title: "Broken link",
    message,
    primaryPath: sourcePath,
    relatedPaths: [targetPath],
    evidence: { link: candidate.linkText, target: targetPath, linkKind },
    ...describeFinding(
      "confirmed",
      severity === "error" ? "The link target could not be resolved in the vault." : `The target note exists, but the referenced ${referenceKind} was not found.`,
      severity === "error" ? "Correct the target or remove the link from the source note." : `Correct the ${referenceKind} reference or remove it from the source note.`
    ),
    fingerprint: generateFingerprint("broken-links", sourcePath, {
      link: candidate.linkText,
      target: targetPath,
      ...fragmentIdentity
    })
  };
  if (candidate.fix) {
    const fix = candidate.fix;
    issue.fixAction = {
      kind: "remove-link-text",
      label: "Remove link",
      description: fix.replacement === "" ? `Remove "${fix.original}" from "${sourcePath}"` : `Replace "${fix.original}" with "${fix.replacement}" in "${sourcePath}"`,
      targetPaths: [sourcePath],
      ...candidate.fixLinkText ? { linkText: candidate.fixLinkText } : {},
      original: fix.original,
      replacement: fix.replacement
    };
  }
  return issue;
}

// src/utils/hash.ts
async function hashContent(content3) {
  const hashBuffer = await crypto.subtle.digest("SHA-256", content3);
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
    const filesByPath = new Map(files.map((file) => [file.path, file]));
    const index2 = ctx.referenceIndex;
    const inboundCount = (path) => {
      var _a2, _b2;
      return (_b2 = (_a2 = getInboundReference(index2, path)) == null ? void 0 : _a2.count) != null ? _b2 : 0;
    };
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
    const hashStates = /* @__PURE__ */ new Map();
    for (const file of candidates) {
      if (file.stat.size > ctx.duplicateHashMaxBytes) {
        hashStates.set(file.path, "cap-exceeded");
        continue;
      }
      try {
        const content3 = await ctx.vault.readBinary(file);
        const hash = await hashContent(content3);
        hashStates.set(file.path, "hash-confirmed");
        const group = (_c = hashGroups.get(hash)) != null ? _c : [];
        group.push(file.path);
        hashGroups.set(hash, group);
      } catch (e) {
        hashStates.set(file.path, "read-failed");
      }
    }
    const referenceCountsOf = (sorted) => sorted.map(inboundCount).join(",");
    const mtimesOf = (sorted) => sorted.map((path) => {
      var _a2, _b2;
      return (_b2 = (_a2 = filesByPath.get(path)) == null ? void 0 : _a2.stat.mtime) != null ? _b2 : 0;
    }).join(",");
    const hashReportedPaths = /* @__PURE__ */ new Set();
    for (const [, paths] of hashGroups) {
      if (paths.length < 2) continue;
      paths.forEach((p) => hashReportedPaths.add(p));
      const sorted = paths.slice().sort();
      const referencedPaths = sorted.filter((path) => inboundCount(path) > 0);
      const requiresReview = referencedPaths.length >= 2;
      const kept = pickAutomaticKeepPath(sorted, index2);
      const duplicates = sorted.filter((path) => path !== kept);
      issues.push({
        scannerId: "duplicate-files",
        severity: "warning",
        title: "Duplicate files (hash-identical)",
        message: `${paths.length} files have identical content`,
        primaryPath: void 0,
        relatedPaths: sorted,
        evidence: {
          count: paths.length,
          paths: paths.join(", "),
          hashState: "hash-confirmed",
          referenceCounts: referenceCountsOf(sorted),
          mtimes: mtimesOf(sorted),
          referencedPaths: referencedPaths.join(",")
        },
        ...describeFinding(
          "confirmed",
          `SHA-256 content hashes match across ${paths.length} files.`,
          requiresReview ? "Several copies are referenced from notes. Review which location to keep before moving any copy to trash." : "Choose the file to keep before moving the remaining copies to trash.",
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
            automaticKeepPath: kept,
            referencedPaths,
            requiresReview
          }
        }
      });
    }
    for (const [name, group] of nameGroups) {
      if (group.length < 2) continue;
      const unreached = group.filter((f) => !hashReportedPaths.has(f.path)).map((f) => f.path).sort();
      if (unreached.length < 2) continue;
      issues.push({
        scannerId: "duplicate-files",
        severity: "info",
        title: "Duplicate file candidates (same name)",
        message: `${unreached.length} files share the name "${name}"`,
        relatedPaths: unreached,
        evidence: {
          count: unreached.length,
          paths: unreached.join(", "),
          hashStates: statesOf(hashStates, unreached),
          referenceCounts: referenceCountsOf(unreached),
          mtimes: mtimesOf(unreached)
        },
        ...describeFinding(
          "candidate",
          `${unreached.length} files share the same filename.`,
          "Compare their content and usage before deciding whether either file is redundant.",
          "Matching names do not prove matching content."
        ),
        fingerprint: generateFingerprint("duplicate-files", void 0, {
          nameCandidates: unreached.join(",")
        })
      });
    }
    for (const [size, group] of sizeGroups) {
      if (group.length < 2) continue;
      const unreached = group.filter((f) => !hashReportedPaths.has(f.path)).map((f) => f.path).sort();
      if (unreached.length < 2) continue;
      issues.push({
        scannerId: "duplicate-files",
        severity: "info",
        title: "Duplicate file candidates (same size)",
        message: `${unreached.length} files share size ${formatSize(size)}`,
        relatedPaths: unreached,
        evidence: {
          count: unreached.length,
          paths: unreached.join(", "),
          hashStates: statesOf(hashStates, unreached),
          referenceCounts: referenceCountsOf(unreached),
          mtimes: mtimesOf(unreached),
          size
        },
        ...describeFinding(
          "candidate",
          `${unreached.length} files share the same byte size.`,
          "Compare their content and usage before deciding whether either file is redundant.",
          "Matching sizes do not prove matching content."
        ),
        fingerprint: generateFingerprint("duplicate-files", void 0, {
          sizeCandidates: unreached.join(",")
        })
      });
    }
    return issues;
  }
};
function pickAutomaticKeepPath(paths, index2) {
  var _a, _b, _c, _d;
  let best = paths[0];
  let bestCount = (_b = (_a = getInboundReference(index2, best)) == null ? void 0 : _a.count) != null ? _b : 0;
  for (const path of paths.slice(1)) {
    const count = (_d = (_c = getInboundReference(index2, path)) == null ? void 0 : _c.count) != null ? _d : 0;
    if (count > bestCount || count === bestCount && path < best) {
      best = path;
      bestCount = count;
    }
  }
  return best;
}
function statesOf(hashStates, paths) {
  return [...new Set(paths.map((path) => {
    var _a;
    return (_a = hashStates.get(path)) != null ? _a : "cap-exceeded";
  }))].sort().join(",");
}

// src/scanner/scanners/empty-notes.ts
var emptyNotesScanner = {
  id: "empty-notes",
  async scan(ctx) {
    var _a, _b;
    const issues = [];
    const index2 = ctx.referenceIndex;
    for (const file of ctx.markdownFiles) {
      if (isIgnoredPath(file.path, ctx.ignoredFolders)) continue;
      const content3 = await ctx.vault.cachedRead(file);
      const body = stripFrontmatterAndTitle(content3);
      const wordCount = countWords(body);
      const structureCount = countMeaningfulStructures(body);
      const inboundReferenceCount = (_b = (_a = getInboundReference(index2, file.path)) == null ? void 0 : _a.count) != null ? _b : 0;
      if (wordCount <= ctx.emptyNoteWordThreshold && structureCount === 0) {
        issues.push({
          scannerId: "empty-notes",
          severity: "warning",
          title: "Empty note",
          message: wordCount === 0 ? "This note has no content besides a title" : `This note only has ${wordCount} word${wordCount > 1 ? "s" : ""} (likely a stub)`,
          primaryPath: file.path,
          relatedPaths: [],
          evidence: {
            size: file.stat.size,
            wordCount,
            structureCount,
            inboundReferenceCount
          },
          ...describeFinding(
            "candidate",
            `The note contains ${wordCount} meaningful word${wordCount === 1 ? "" : "s"} and no meaningful structures (links, embeds, tasks, list items, or code blocks), at or below the configured threshold of ${ctx.emptyNoteWordThreshold}.`,
            inboundReferenceCount > 0 ? `This stub is referenced by ${inboundReferenceCount} inbound link${inboundReferenceCount === 1 ? "" : "s"}. Review why it is referenced before adding content or deleting it.` : "Add meaningful content, ignore the finding, or move the note to trash after review.",
            "Intentional placeholders, index notes, and generated stubs can be valid."
          ),
          fingerprint: generateFingerprint("empty-notes", file.path, {}),
          // Delete eligibility requires zero inbound references: a
          // referenced stub may be a deliberate index entry, so it
          // stays reviewable and out of bulk-delete flows.
          ...inboundReferenceCount === 0 ? {
            fixAction: {
              kind: "trash-file",
              label: "Delete",
              description: `Move "${file.path}" to trash`,
              targetPaths: [file.path]
            }
          } : {}
        });
      }
    }
    return issues;
  }
};
function stripFrontmatterAndTitle(content3) {
  let text3 = content3;
  if (text3.startsWith("---")) {
    const end = text3.indexOf("\n---", 3);
    if (end !== -1) {
      text3 = text3.slice(end + 4);
    }
  }
  text3 = text3.replace(/^#+\s+.*$/m, "");
  return text3;
}
function countWords(text3) {
  let count = 0;
  const cjkPattern = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;
  for (const match of text3.matchAll(cjkPattern)) {
    void match;
    count++;
  }
  const withoutCjk = text3.replace(cjkPattern, " ");
  for (const segment of withoutCjk.split(/\s+/)) {
    if (segment.length > 0) count++;
  }
  return count;
}
function countMeaningfulStructures(body) {
  let count = 0;
  const visible = body.replace(/<!--[\s\S]*?-->/g, "");
  for (const match of visible.matchAll(/\[\[[^\]]+\]\]/g)) {
    void match;
    count++;
  }
  for (const match of visible.matchAll(/!?\[[^\]\r\n]*\]\(\s*(?:<[^>\r\n]+>|[^)\r\n]+)\s*\)/g)) {
    const bracketIndex = match.index + (match[0].startsWith("!") ? 1 : 0);
    if (visible[bracketIndex - 1] === "\\") continue;
    count++;
  }
  let inFence = false;
  let fenceHasContent = false;
  let inTable = false;
  for (const line of visible.split("\n")) {
    const trimmed = line.trim();
    if (/^(```|~~~)/.test(trimmed)) {
      if (inFence && fenceHasContent) count++;
      inFence = !inFence;
      fenceHasContent = false;
      continue;
    }
    if (inFence) {
      if (trimmed !== "") fenceHasContent = true;
      continue;
    }
    if (trimmed === "") continue;
    if (/^\|.*\|/.test(trimmed)) {
      if (!inTable) {
        count++;
        inTable = true;
      }
      continue;
    }
    inTable = false;
    if (/^[-*+]\s+\[[ xX]\]/.test(trimmed)) {
      count++;
      continue;
    }
    if (/^\d+[.)]\s+\[[ xX]\]/.test(trimmed)) {
      count++;
      continue;
    }
    if (/^[-*+]\s+\S/.test(trimmed)) {
      count++;
      continue;
    }
    if (/^\d+[.)]\s+\S/.test(trimmed)) {
      count++;
      continue;
    }
    if (/<img\b/.test(trimmed)) {
      count++;
    }
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
var HEAD_REJECTED_STATUSES = /* @__PURE__ */ new Set([405, 501]);
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
      const content3 = await ctx.vault.cachedRead(file);
      for (const url of extractBareUrls(content3)) {
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
function isExternalUrl(text3) {
  return /^https?:\/\//i.test(text3);
}
function extractBareUrls(content3) {
  const urls = [];
  const seen = /* @__PURE__ */ new Set();
  const body = stripIgnoredMarkdownRegions(stripFrontmatter(content3));
  const urlPattern = /https?:\/\/[^\s<>"']+/gi;
  for (const match of body.matchAll(urlPattern)) {
    const url = trimUrlBoundary(match[0]);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}
function stripFrontmatter(content3) {
  const match = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.exec(content3);
  return match ? content3.slice(match[0].length) : content3;
}
function stripIgnoredMarkdownRegions(content3) {
  return content3.replace(/<!--[\s\S]*?-->/g, "").replace(/^[ \t]*(`{3,}|~{3,})[^\r\n]*\r?\n[\s\S]*?^[ \t]*\1[^\r\n]*$/gm, "").replace(/(`+)[^\r\n]*?\1/g, "");
}
function trimUrlBoundary(url) {
  var _a, _b;
  let trimmed = url;
  while (/[),.;:!?]$/.test(trimmed)) {
    if (trimmed.endsWith(")")) {
      const opens = ((_a = trimmed.match(/\(/g)) != null ? _a : []).length;
      const closes = ((_b = trimmed.match(/\)/g)) != null ? _b : []).length;
      if (closes <= opens) break;
    }
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
  if (!(ctx == null ? void 0 : ctx.requestUrl)) {
    return {
      url,
      sourcePath: "",
      kind: "failed",
      error: "No request adapter configured"
    };
  }
  let head;
  try {
    head = await ctx.requestUrl(url, "HEAD", signal);
  } catch (error) {
    return { url, sourcePath: "", kind: "failed", error: errorMessage(error) };
  }
  if (!HEAD_REJECTED_STATUSES.has(head.status)) {
    return { url, sourcePath: "", kind: "http", status: head.status, method: "HEAD" };
  }
  const fallbackAssessment = assessExternalHttpUrl(url);
  if (!fallbackAssessment.allowed) {
    return {
      url,
      sourcePath: "",
      kind: "blocked",
      reason: fallbackAssessment.reason
    };
  }
  try {
    const rangeGet = await ctx.requestUrl(url, "GET", signal);
    return { url, sourcePath: "", kind: "http", status: rangeGet.status, method: "GET" };
  } catch (error) {
    return { url, sourcePath: "", kind: "failed", error: errorMessage(error) };
  }
}
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
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
    if (result.status === 401 || result.status === 403) {
      return {
        ...describeFinding(
          "unverified",
          `The server returned HTTP ${result.status}, so this URL's availability could not be verified.`,
          "Open the URL in a browser \u2014 a login, paywall, or bot protection may be required.",
          "Access-restricted responses do not mean the link is dead."
        ),
        scannerId: "external-links",
        severity: "info",
        title: "External link access restricted",
        message: `HTTP ${result.status} \u2014 ${result.url}`,
        primaryPath: result.sourcePath,
        relatedPaths: [],
        evidence: {
          url: result.url,
          status: result.status,
          method: result.method,
          restricted: true
        },
        fingerprint: generateFingerprint("external-links", result.sourcePath, {
          url: result.url,
          restricted: true
        })
      };
    }
    if (result.status === 429) {
      return {
        ...describeFinding(
          "unverified",
          "The server rate-limited the check (HTTP 429), so this URL's availability could not be verified.",
          "Run the scan again later.",
          "Rate-limited responses do not mean the link is dead."
        ),
        scannerId: "external-links",
        severity: "info",
        title: "External link rate limited",
        message: `HTTP ${result.status} \u2014 ${result.url}`,
        primaryPath: result.sourcePath,
        relatedPaths: [],
        evidence: {
          url: result.url,
          status: result.status,
          method: result.method,
          rateLimited: true
        },
        fingerprint: generateFingerprint("external-links", result.sourcePath, {
          url: result.url,
          rateLimited: true
        })
      };
    }
    if (result.status >= 500) {
      return {
        ...describeFinding(
          "candidate",
          `The server reported a failure (HTTP ${result.status}).`,
          "Run the scan again later; if the failure persists, verify the URL manually.",
          "Server-side failures are often temporary and do not yet indicate a dead link."
        ),
        scannerId: "external-links",
        severity: "info",
        title: "External link server error",
        message: `HTTP ${result.status} \u2014 ${result.url}`,
        primaryPath: result.sourcePath,
        relatedPaths: [],
        evidence: {
          url: result.url,
          status: result.status,
          method: result.method,
          serverError: true
        },
        fingerprint: generateFingerprint("external-links", result.sourcePath, {
          url: result.url,
          serverError: true
        })
      };
    }
    return {
      ...describeFinding(
        "candidate",
        `The server returned HTTP ${result.status} for this URL.`,
        "Open the URL manually, then update or remove it if the failure persists.",
        "HTTP 404 and 410 strongly indicate the resource is gone; access restrictions, rate limits, and server failures are reported separately."
      ),
      scannerId: "external-links",
      severity: "warning",
      title: "Dead external link",
      message: `HTTP ${result.status} \u2014 ${result.url}`,
      primaryPath: result.sourcePath,
      relatedPaths: [],
      evidence: {
        url: result.url,
        status: result.status,
        method: result.method
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
    const index2 = ctx.referenceIndex;
    for (const file of ctx.allFiles) {
      if (isIgnoredPath(file.path, ctx.ignoredFolders)) continue;
      if (!isAttachment(file.path)) continue;
      if (isReferenced(index2, file.path)) continue;
      const severity = isRecent(file.stat.mtime) ? "info" : "warning";
      issues.push({
        scannerId: "orphan-attachments",
        severity,
        title: "Orphan attachment",
        message: "This attachment is not referenced by any note",
        primaryPath: file.path,
        relatedPaths: [],
        evidence: {
          size: file.stat.size,
          lastModified: file.stat.mtime,
          // Referenced files are skipped above, so this is always 0;
          // recorded to make "no inbound references" explicit evidence.
          referenceCount: 0,
          coverageComplete: index2.coverageComplete
        },
        ...describeFinding(
          "candidate",
          "No note, embed, frontmatter link, or Canvas file node in the vault references this attachment.",
          index2.coverageComplete ? "Review external and generated references before moving the file to trash." : "Resolve the incomplete reference coverage below before moving the file to trash.",
          "CSS, Dataview, publishing pipelines, and external tools can reference files outside this scan boundary."
        ),
        fingerprint: generateFingerprint("orphan-attachments", file.path, {
          orphan: true
        }),
        // Delete eligibility requires complete reference coverage:
        // unindexed Markdown or Canvas sources could reference this file.
        ...index2.coverageComplete ? {
          fixAction: {
            kind: "trash-file",
            label: "Delete",
            description: `Move "${file.path}" to trash`,
            targetPaths: [file.path]
          }
        } : {}
      });
    }
    if (index2.coverageFailures.length > 0) {
      issues.push(buildCoverageFinding(index2.coverageFailures));
    }
    return issues;
  }
};
function buildCoverageFinding(failures) {
  const sorted = [...failures].sort(
    (a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0
  );
  const failedPaths = sorted.map((failure) => failure.path);
  const reasons = [...new Set(sorted.map((failure) => failure.reason))].sort().join(",");
  return {
    scannerId: "orphan-attachments",
    severity: "info",
    title: "Reference coverage incomplete",
    message: `${failedPaths.length} reference source file${failedPaths.length === 1 ? "" : "s"} could not be indexed (${reasons}); orphan results may be incomplete`,
    primaryPath: failedPaths[0],
    relatedPaths: failedPaths,
    evidence: {
      failedCount: failedPaths.length,
      failedPaths: failedPaths.join(","),
      reasons
    },
    ...describeFinding(
      "unverified",
      "Markdown metadata or Canvas reference sources could not be fully indexed, so the absence of references for some attachments is not yet trustworthy.",
      "Resolve the reference coverage failures listed here, then rescan."
    ),
    fingerprint: generateFingerprint("orphan-attachments", failedPaths[0], {
      coverageFailure: true,
      paths: failedPaths.join(",")
    })
  };
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
  automaticScanIntervalHours: 0,
  automaticScanNetworkChecks: false,
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
        heading: "Automatic scanning",
        items: [
          {
            name: "Automatic scan interval (hours)",
            desc: "Run one read-only scan after startup when the last successful scan is older than this many hours. 0 disables automatic scans.",
            render: (setting) => {
              setting.addSlider(
                (slider) => slider.setLimits(0, 168, 1).setValue(this.plugin.settings.automaticScanIntervalHours).onChange(async (value) => {
                  this.plugin.settings.automaticScanIntervalHours = value;
                  await this.plugin.saveSettings();
                })
              );
            }
          },
          {
            name: "Automatic scan network checks",
            desc: "Allow automatic scans to include the external link scanner. Off by default, so automatic scans never touch the network without a separate opt-in.",
            render: (setting) => {
              setting.addToggle(
                (toggle) => toggle.setValue(this.plugin.settings.automaticScanNetworkChecks).onChange(async (value) => {
                  this.plugin.settings.automaticScanNetworkChecks = value;
                  await this.plugin.saveSettings();
                })
              );
            }
          }
        ]
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
                (text3) => text3.setValue(this.plugin.settings.ignoredLargeMarkdownFrontmatterKeys.join(", ")).setPlaceholder("Frontmatter keys to ignore").onChange(async (value) => {
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
                (text3) => text3.setValue(this.plugin.settings.ignoredLargeMarkdownPathPatterns.join(", ")).setPlaceholder("E.g. index/**/*.md, **/*.canvas.md").onChange(async (value) => {
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
                (text3) => text3.setValue(this.plugin.settings.watchedTags.join(", ")).setPlaceholder("E.g. Todo, review, project").onChange(async (value) => {
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
                (text3) => text3.setValue(this.plugin.settings.ignoredFolders.join(", ")).setPlaceholder("E.g. Templates, archive").onChange(async (value) => {
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
                (text3) => text3.setValue(this.plugin.settings.ignoredProperties.join(", ")).setPlaceholder("E.g. Cssclasses, aliases").onChange(async (value) => {
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
              (text3) => text3.setValue(
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
                (text3) => text3.setValue(this.plugin.settings.reportFolderPath).setPlaceholder("Inspector reports").onChange(async (value) => {
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
    const paths = issue.relatedPaths;
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
    const size = getNumber2(issue.evidence.size);
    if (size !== null) details.push({ label: "Size", value: formatSize(size) });
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
function getNumber2(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function formatTag2(tag) {
  return tag.startsWith("#") ? tag : `#${tag}`;
}
function formatCode(text3) {
  return `\`${escapeInlineCode(text3)}\``;
}
function groupByScanner2(issues) {
  const groups = {};
  for (const issue of issues) {
    if (!groups[issue.scannerId]) groups[issue.scannerId] = [];
    groups[issue.scannerId].push(issue);
  }
  return groups;
}
function escapeMd(text3) {
  return text3.replace(/\|/g, "\\|").replace(/\n/g, " ");
}
function escapeInlineCode(text3) {
  return text3.replace(/`/g, "\\`");
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

// node_modules/mdast-util-to-string/lib/index.js
var emptyOptions = {};
function toString(value, options) {
  const settings = options || emptyOptions;
  const includeImageAlt = typeof settings.includeImageAlt === "boolean" ? settings.includeImageAlt : true;
  const includeHtml = typeof settings.includeHtml === "boolean" ? settings.includeHtml : true;
  return one(value, includeImageAlt, includeHtml);
}
function one(value, includeImageAlt, includeHtml) {
  if (node(value)) {
    if ("value" in value) {
      return value.type === "html" && !includeHtml ? "" : value.value;
    }
    if (includeImageAlt && "alt" in value && value.alt) {
      return value.alt;
    }
    if ("children" in value) {
      return all(value.children, includeImageAlt, includeHtml);
    }
  }
  if (Array.isArray(value)) {
    return all(value, includeImageAlt, includeHtml);
  }
  return "";
}
function all(values, includeImageAlt, includeHtml) {
  const result = [];
  let index2 = -1;
  while (++index2 < values.length) {
    result[index2] = one(values[index2], includeImageAlt, includeHtml);
  }
  return result.join("");
}
function node(value) {
  return Boolean(value && typeof value === "object");
}

// node_modules/decode-named-character-reference/index.dom.js
var element = document.createElement("i");
function decodeNamedCharacterReference(value) {
  const characterReference2 = "&" + value + ";";
  element.innerHTML = characterReference2;
  const character = element.textContent;
  if (character.charCodeAt(character.length - 1) === 59 && value !== "semi") {
    return false;
  }
  return character === characterReference2 ? false : character;
}

// node_modules/micromark-util-chunked/index.js
function splice(list2, start, remove, items) {
  const end = list2.length;
  let chunkStart = 0;
  let parameters;
  if (start < 0) {
    start = -start > end ? 0 : end + start;
  } else {
    start = start > end ? end : start;
  }
  remove = remove > 0 ? remove : 0;
  if (items.length < 1e4) {
    parameters = Array.from(items);
    parameters.unshift(start, remove);
    list2.splice(...parameters);
  } else {
    if (remove) list2.splice(start, remove);
    while (chunkStart < items.length) {
      parameters = items.slice(chunkStart, chunkStart + 1e4);
      parameters.unshift(start, 0);
      list2.splice(...parameters);
      chunkStart += 1e4;
      start += 1e4;
    }
  }
}
function push(list2, items) {
  if (list2.length > 0) {
    splice(list2, list2.length, 0, items);
    return list2;
  }
  return items;
}

// node_modules/micromark-util-combine-extensions/index.js
var hasOwnProperty = {}.hasOwnProperty;
function combineExtensions(extensions) {
  const all2 = {};
  let index2 = -1;
  while (++index2 < extensions.length) {
    syntaxExtension(all2, extensions[index2]);
  }
  return all2;
}
function syntaxExtension(all2, extension2) {
  let hook;
  for (hook in extension2) {
    const maybe = hasOwnProperty.call(all2, hook) ? all2[hook] : void 0;
    const left = maybe || (all2[hook] = {});
    const right = extension2[hook];
    let code;
    if (right) {
      for (code in right) {
        if (!hasOwnProperty.call(left, code)) left[code] = [];
        const value = right[code];
        constructs(
          // @ts-expect-error Looks like a list.
          left[code],
          Array.isArray(value) ? value : value ? [value] : []
        );
      }
    }
  }
}
function constructs(existing, list2) {
  let index2 = -1;
  const before = [];
  while (++index2 < list2.length) {
    ;
    (list2[index2].add === "after" ? existing : before).push(list2[index2]);
  }
  splice(existing, 0, 0, before);
}

// node_modules/micromark-util-decode-numeric-character-reference/index.js
function decodeNumericCharacterReference(value, base) {
  const code = Number.parseInt(value, base);
  if (
    // C0 except for HT, LF, FF, CR, space.
    code < 9 || code === 11 || code > 13 && code < 32 || // Control character (DEL) of C0, and C1 controls.
    code > 126 && code < 160 || // Lone high surrogates and low surrogates.
    code > 55295 && code < 57344 || // Noncharacters.
    code > 64975 && code < 65008 || /* eslint-disable no-bitwise */
    (code & 65535) === 65535 || (code & 65535) === 65534 || /* eslint-enable no-bitwise */
    // Out of range
    code > 1114111
  ) {
    return "\uFFFD";
  }
  return String.fromCodePoint(code);
}

// node_modules/micromark-util-normalize-identifier/index.js
function normalizeIdentifier(value) {
  return value.replace(/[\t\n\r ]+/g, " ").replace(/^ | $/g, "").toLowerCase().toUpperCase();
}

// node_modules/micromark-util-character/index.js
var asciiAlpha = regexCheck(/[A-Za-z]/);
var asciiAlphanumeric = regexCheck(/[\dA-Za-z]/);
var asciiAtext = regexCheck(/[#-'*+\--9=?A-Z^-~]/);
function asciiControl(code) {
  return (
    // Special whitespace codes (which have negative values), C0 and Control
    // character DEL
    code !== null && (code < 32 || code === 127)
  );
}
var asciiDigit = regexCheck(/\d/);
var asciiHexDigit = regexCheck(/[\dA-Fa-f]/);
var asciiPunctuation = regexCheck(/[!-/:-@[-`{-~]/);
function markdownLineEnding(code) {
  return code !== null && code < -2;
}
function markdownLineEndingOrSpace(code) {
  return code !== null && (code < 0 || code === 32);
}
function markdownSpace(code) {
  return code === -2 || code === -1 || code === 32;
}
var unicodePunctuation = regexCheck(/\p{P}|\p{S}/u);
var unicodeWhitespace = regexCheck(/\s/);
function regexCheck(regex) {
  return check;
  function check(code) {
    return code !== null && code > -1 && regex.test(String.fromCharCode(code));
  }
}

// node_modules/micromark-factory-space/index.js
function factorySpace(effects, ok, type, max) {
  const limit = max ? max - 1 : Number.POSITIVE_INFINITY;
  let size = 0;
  return start;
  function start(code) {
    if (markdownSpace(code)) {
      effects.enter(type);
      return prefix(code);
    }
    return ok(code);
  }
  function prefix(code) {
    if (markdownSpace(code) && size++ < limit) {
      effects.consume(code);
      return prefix;
    }
    effects.exit(type);
    return ok(code);
  }
}

// node_modules/micromark/lib/initialize/content.js
var content = {
  tokenize: initializeContent
};
function initializeContent(effects) {
  const contentStart = effects.attempt(this.parser.constructs.contentInitial, afterContentStartConstruct, paragraphInitial);
  let previous2;
  return contentStart;
  function afterContentStartConstruct(code) {
    if (code === null) {
      effects.consume(code);
      return;
    }
    effects.enter("lineEnding");
    effects.consume(code);
    effects.exit("lineEnding");
    return factorySpace(effects, contentStart, "linePrefix");
  }
  function paragraphInitial(code) {
    effects.enter("paragraph");
    return lineStart(code);
  }
  function lineStart(code) {
    const token = effects.enter("chunkText", {
      contentType: "text",
      previous: previous2
    });
    if (previous2) {
      previous2.next = token;
    }
    previous2 = token;
    return data(code);
  }
  function data(code) {
    if (code === null) {
      effects.exit("chunkText");
      effects.exit("paragraph");
      effects.consume(code);
      return;
    }
    if (markdownLineEnding(code)) {
      effects.consume(code);
      effects.exit("chunkText");
      return lineStart;
    }
    effects.consume(code);
    return data;
  }
}

// node_modules/micromark/lib/initialize/document.js
var document2 = {
  tokenize: initializeDocument
};
var containerConstruct = {
  tokenize: tokenizeContainer
};
function initializeDocument(effects) {
  const self = this;
  const stack = [];
  let continued = 0;
  let childFlow;
  let childToken;
  let lineStartOffset;
  return start;
  function start(code) {
    if (continued < stack.length) {
      const item = stack[continued];
      self.containerState = item[1];
      return effects.attempt(item[0].continuation, documentContinue, checkNewContainers)(code);
    }
    return checkNewContainers(code);
  }
  function documentContinue(code) {
    continued++;
    if (self.containerState._closeFlow) {
      self.containerState._closeFlow = void 0;
      if (childFlow) {
        closeFlow();
      }
      const indexBeforeExits = self.events.length;
      let indexBeforeFlow = indexBeforeExits;
      let point3;
      while (indexBeforeFlow--) {
        if (self.events[indexBeforeFlow][0] === "exit" && self.events[indexBeforeFlow][1].type === "chunkFlow") {
          point3 = self.events[indexBeforeFlow][1].end;
          break;
        }
      }
      exitContainers(continued);
      let index2 = indexBeforeExits;
      while (index2 < self.events.length) {
        self.events[index2][1].end = {
          ...point3
        };
        index2++;
      }
      splice(self.events, indexBeforeFlow + 1, 0, self.events.slice(indexBeforeExits));
      self.events.length = index2;
      return checkNewContainers(code);
    }
    return start(code);
  }
  function checkNewContainers(code) {
    if (continued === stack.length) {
      if (!childFlow) {
        return documentContinued(code);
      }
      if (childFlow.currentConstruct && childFlow.currentConstruct.concrete) {
        return flowStart(code);
      }
      self.interrupt = Boolean(childFlow.currentConstruct && !childFlow._gfmTableDynamicInterruptHack);
    }
    self.containerState = {};
    return effects.check(containerConstruct, thereIsANewContainer, thereIsNoNewContainer)(code);
  }
  function thereIsANewContainer(code) {
    if (childFlow) closeFlow();
    exitContainers(continued);
    return documentContinued(code);
  }
  function thereIsNoNewContainer(code) {
    self.parser.lazy[self.now().line] = continued !== stack.length;
    lineStartOffset = self.now().offset;
    return flowStart(code);
  }
  function documentContinued(code) {
    self.containerState = {};
    return effects.attempt(containerConstruct, containerContinue, flowStart)(code);
  }
  function containerContinue(code) {
    continued++;
    stack.push([self.currentConstruct, self.containerState]);
    return documentContinued(code);
  }
  function flowStart(code) {
    if (code === null) {
      if (childFlow) closeFlow();
      exitContainers(0);
      effects.consume(code);
      return;
    }
    childFlow = childFlow || self.parser.flow(self.now());
    effects.enter("chunkFlow", {
      _tokenizer: childFlow,
      contentType: "flow",
      previous: childToken
    });
    return flowContinue(code);
  }
  function flowContinue(code) {
    if (code === null) {
      writeToChild(effects.exit("chunkFlow"), true);
      exitContainers(0);
      effects.consume(code);
      return;
    }
    if (markdownLineEnding(code)) {
      effects.consume(code);
      writeToChild(effects.exit("chunkFlow"));
      continued = 0;
      self.interrupt = void 0;
      return start;
    }
    effects.consume(code);
    return flowContinue;
  }
  function writeToChild(token, endOfFile) {
    const stream = self.sliceStream(token);
    if (endOfFile) stream.push(null);
    token.previous = childToken;
    if (childToken) childToken.next = token;
    childToken = token;
    childFlow.defineSkip(token.start);
    childFlow.write(stream);
    if (self.parser.lazy[token.start.line]) {
      let index2 = childFlow.events.length;
      while (index2--) {
        if (
          // The token starts before the line ending…
          childFlow.events[index2][1].start.offset < lineStartOffset && // …and either is not ended yet…
          (!childFlow.events[index2][1].end || // …or ends after it.
          childFlow.events[index2][1].end.offset > lineStartOffset)
        ) {
          return;
        }
      }
      const indexBeforeExits = self.events.length;
      let indexBeforeFlow = indexBeforeExits;
      let seen;
      let point3;
      while (indexBeforeFlow--) {
        if (self.events[indexBeforeFlow][0] === "exit" && self.events[indexBeforeFlow][1].type === "chunkFlow") {
          if (seen) {
            point3 = self.events[indexBeforeFlow][1].end;
            break;
          }
          seen = true;
        }
      }
      exitContainers(continued);
      index2 = indexBeforeExits;
      while (index2 < self.events.length) {
        self.events[index2][1].end = {
          ...point3
        };
        index2++;
      }
      splice(self.events, indexBeforeFlow + 1, 0, self.events.slice(indexBeforeExits));
      self.events.length = index2;
    }
  }
  function exitContainers(size) {
    let index2 = stack.length;
    while (index2-- > size) {
      const entry = stack[index2];
      self.containerState = entry[1];
      entry[0].exit.call(self, effects);
    }
    stack.length = size;
  }
  function closeFlow() {
    childFlow.write([null]);
    childToken = void 0;
    childFlow = void 0;
    self.containerState._closeFlow = void 0;
  }
}
function tokenizeContainer(effects, ok, nok) {
  return factorySpace(effects, effects.attempt(this.parser.constructs.document, ok, nok), "linePrefix", this.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4);
}

// node_modules/micromark-util-classify-character/index.js
function classifyCharacter(code) {
  if (code === null || markdownLineEndingOrSpace(code) || unicodeWhitespace(code)) {
    return 1;
  }
  if (unicodePunctuation(code)) {
    return 2;
  }
}

// node_modules/micromark-util-resolve-all/index.js
function resolveAll(constructs2, events, context) {
  const called = [];
  let index2 = -1;
  while (++index2 < constructs2.length) {
    const resolve = constructs2[index2].resolveAll;
    if (resolve && !called.includes(resolve)) {
      events = resolve(events, context);
      called.push(resolve);
    }
  }
  return events;
}

// node_modules/micromark-core-commonmark/lib/attention.js
var attention = {
  name: "attention",
  resolveAll: resolveAllAttention,
  tokenize: tokenizeAttention
};
function resolveAllAttention(events, context) {
  let index2 = -1;
  let open;
  let group;
  let text3;
  let openingSequence;
  let closingSequence;
  let use;
  let nextEvents;
  let offset;
  while (++index2 < events.length) {
    if (events[index2][0] === "enter" && events[index2][1].type === "attentionSequence" && events[index2][1]._close) {
      open = index2;
      while (open--) {
        if (events[open][0] === "exit" && events[open][1].type === "attentionSequence" && events[open][1]._open && // If the markers are the same:
        context.sliceSerialize(events[open][1]).charCodeAt(0) === context.sliceSerialize(events[index2][1]).charCodeAt(0)) {
          if ((events[open][1]._close || events[index2][1]._open) && (events[index2][1].end.offset - events[index2][1].start.offset) % 3 && !((events[open][1].end.offset - events[open][1].start.offset + events[index2][1].end.offset - events[index2][1].start.offset) % 3)) {
            continue;
          }
          use = events[open][1].end.offset - events[open][1].start.offset > 1 && events[index2][1].end.offset - events[index2][1].start.offset > 1 ? 2 : 1;
          const start = {
            ...events[open][1].end
          };
          const end = {
            ...events[index2][1].start
          };
          movePoint(start, -use);
          movePoint(end, use);
          openingSequence = {
            type: use > 1 ? "strongSequence" : "emphasisSequence",
            start,
            end: {
              ...events[open][1].end
            }
          };
          closingSequence = {
            type: use > 1 ? "strongSequence" : "emphasisSequence",
            start: {
              ...events[index2][1].start
            },
            end
          };
          text3 = {
            type: use > 1 ? "strongText" : "emphasisText",
            start: {
              ...events[open][1].end
            },
            end: {
              ...events[index2][1].start
            }
          };
          group = {
            type: use > 1 ? "strong" : "emphasis",
            start: {
              ...openingSequence.start
            },
            end: {
              ...closingSequence.end
            }
          };
          events[open][1].end = {
            ...openingSequence.start
          };
          events[index2][1].start = {
            ...closingSequence.end
          };
          nextEvents = [];
          if (events[open][1].end.offset - events[open][1].start.offset) {
            nextEvents = push(nextEvents, [["enter", events[open][1], context], ["exit", events[open][1], context]]);
          }
          nextEvents = push(nextEvents, [["enter", group, context], ["enter", openingSequence, context], ["exit", openingSequence, context], ["enter", text3, context]]);
          nextEvents = push(nextEvents, resolveAll(context.parser.constructs.insideSpan.null, events.slice(open + 1, index2), context));
          nextEvents = push(nextEvents, [["exit", text3, context], ["enter", closingSequence, context], ["exit", closingSequence, context], ["exit", group, context]]);
          if (events[index2][1].end.offset - events[index2][1].start.offset) {
            offset = 2;
            nextEvents = push(nextEvents, [["enter", events[index2][1], context], ["exit", events[index2][1], context]]);
          } else {
            offset = 0;
          }
          splice(events, open - 1, index2 - open + 3, nextEvents);
          index2 = open + nextEvents.length - offset - 2;
          break;
        }
      }
    }
  }
  index2 = -1;
  while (++index2 < events.length) {
    if (events[index2][1].type === "attentionSequence") {
      events[index2][1].type = "data";
    }
  }
  return events;
}
function tokenizeAttention(effects, ok) {
  const attentionMarkers2 = this.parser.constructs.attentionMarkers.null;
  const previous2 = this.previous;
  const before = classifyCharacter(previous2);
  let marker;
  return start;
  function start(code) {
    marker = code;
    effects.enter("attentionSequence");
    return inside(code);
  }
  function inside(code) {
    if (code === marker) {
      effects.consume(code);
      return inside;
    }
    const token = effects.exit("attentionSequence");
    const after = classifyCharacter(code);
    const open = !after || after === 2 && before || attentionMarkers2.includes(code);
    const close = !before || before === 2 && after || attentionMarkers2.includes(previous2);
    token._open = Boolean(marker === 42 ? open : open && (before || !close));
    token._close = Boolean(marker === 42 ? close : close && (after || !open));
    return ok(code);
  }
}
function movePoint(point3, offset) {
  point3.column += offset;
  point3.offset += offset;
  point3._bufferIndex += offset;
}

// node_modules/micromark-core-commonmark/lib/autolink.js
var autolink = {
  name: "autolink",
  tokenize: tokenizeAutolink
};
function tokenizeAutolink(effects, ok, nok) {
  let size = 0;
  return start;
  function start(code) {
    effects.enter("autolink");
    effects.enter("autolinkMarker");
    effects.consume(code);
    effects.exit("autolinkMarker");
    effects.enter("autolinkProtocol");
    return open;
  }
  function open(code) {
    if (asciiAlpha(code)) {
      effects.consume(code);
      return schemeOrEmailAtext;
    }
    if (code === 64) {
      return nok(code);
    }
    return emailAtext(code);
  }
  function schemeOrEmailAtext(code) {
    if (code === 43 || code === 45 || code === 46 || asciiAlphanumeric(code)) {
      size = 1;
      return schemeInsideOrEmailAtext(code);
    }
    return emailAtext(code);
  }
  function schemeInsideOrEmailAtext(code) {
    if (code === 58) {
      effects.consume(code);
      size = 0;
      return urlInside;
    }
    if ((code === 43 || code === 45 || code === 46 || asciiAlphanumeric(code)) && size++ < 32) {
      effects.consume(code);
      return schemeInsideOrEmailAtext;
    }
    size = 0;
    return emailAtext(code);
  }
  function urlInside(code) {
    if (code === 62) {
      effects.exit("autolinkProtocol");
      effects.enter("autolinkMarker");
      effects.consume(code);
      effects.exit("autolinkMarker");
      effects.exit("autolink");
      return ok;
    }
    if (code === null || code === 32 || code === 60 || asciiControl(code)) {
      return nok(code);
    }
    effects.consume(code);
    return urlInside;
  }
  function emailAtext(code) {
    if (code === 64) {
      effects.consume(code);
      return emailAtSignOrDot;
    }
    if (asciiAtext(code)) {
      effects.consume(code);
      return emailAtext;
    }
    return nok(code);
  }
  function emailAtSignOrDot(code) {
    return asciiAlphanumeric(code) ? emailLabel(code) : nok(code);
  }
  function emailLabel(code) {
    if (code === 46) {
      effects.consume(code);
      size = 0;
      return emailAtSignOrDot;
    }
    if (code === 62) {
      effects.exit("autolinkProtocol").type = "autolinkEmail";
      effects.enter("autolinkMarker");
      effects.consume(code);
      effects.exit("autolinkMarker");
      effects.exit("autolink");
      return ok;
    }
    return emailValue(code);
  }
  function emailValue(code) {
    if ((code === 45 || asciiAlphanumeric(code)) && size++ < 63) {
      const next = code === 45 ? emailValue : emailLabel;
      effects.consume(code);
      return next;
    }
    return nok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/blank-line.js
var blankLine = {
  partial: true,
  tokenize: tokenizeBlankLine
};
function tokenizeBlankLine(effects, ok, nok) {
  return start;
  function start(code) {
    return markdownSpace(code) ? factorySpace(effects, after, "linePrefix")(code) : after(code);
  }
  function after(code) {
    return code === null || markdownLineEnding(code) ? ok(code) : nok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/block-quote.js
var blockQuote = {
  continuation: {
    tokenize: tokenizeBlockQuoteContinuation
  },
  exit,
  name: "blockQuote",
  tokenize: tokenizeBlockQuoteStart
};
function tokenizeBlockQuoteStart(effects, ok, nok) {
  const self = this;
  return start;
  function start(code) {
    if (code === 62) {
      const state = self.containerState;
      if (!state.open) {
        effects.enter("blockQuote", {
          _container: true
        });
        state.open = true;
      }
      effects.enter("blockQuotePrefix");
      effects.enter("blockQuoteMarker");
      effects.consume(code);
      effects.exit("blockQuoteMarker");
      return after;
    }
    return nok(code);
  }
  function after(code) {
    if (markdownSpace(code)) {
      effects.enter("blockQuotePrefixWhitespace");
      effects.consume(code);
      effects.exit("blockQuotePrefixWhitespace");
      effects.exit("blockQuotePrefix");
      return ok;
    }
    effects.exit("blockQuotePrefix");
    return ok(code);
  }
}
function tokenizeBlockQuoteContinuation(effects, ok, nok) {
  const self = this;
  return contStart;
  function contStart(code) {
    if (markdownSpace(code)) {
      return factorySpace(effects, contBefore, "linePrefix", self.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(code);
    }
    return contBefore(code);
  }
  function contBefore(code) {
    return effects.attempt(blockQuote, ok, nok)(code);
  }
}
function exit(effects) {
  effects.exit("blockQuote");
}

// node_modules/micromark-core-commonmark/lib/character-escape.js
var characterEscape = {
  name: "characterEscape",
  tokenize: tokenizeCharacterEscape
};
function tokenizeCharacterEscape(effects, ok, nok) {
  return start;
  function start(code) {
    effects.enter("characterEscape");
    effects.enter("escapeMarker");
    effects.consume(code);
    effects.exit("escapeMarker");
    return inside;
  }
  function inside(code) {
    if (asciiPunctuation(code)) {
      effects.enter("characterEscapeValue");
      effects.consume(code);
      effects.exit("characterEscapeValue");
      effects.exit("characterEscape");
      return ok;
    }
    return nok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/character-reference.js
var characterReference = {
  name: "characterReference",
  tokenize: tokenizeCharacterReference
};
function tokenizeCharacterReference(effects, ok, nok) {
  const self = this;
  let size = 0;
  let max;
  let test;
  return start;
  function start(code) {
    effects.enter("characterReference");
    effects.enter("characterReferenceMarker");
    effects.consume(code);
    effects.exit("characterReferenceMarker");
    return open;
  }
  function open(code) {
    if (code === 35) {
      effects.enter("characterReferenceMarkerNumeric");
      effects.consume(code);
      effects.exit("characterReferenceMarkerNumeric");
      return numeric;
    }
    effects.enter("characterReferenceValue");
    max = 31;
    test = asciiAlphanumeric;
    return value(code);
  }
  function numeric(code) {
    if (code === 88 || code === 120) {
      effects.enter("characterReferenceMarkerHexadecimal");
      effects.consume(code);
      effects.exit("characterReferenceMarkerHexadecimal");
      effects.enter("characterReferenceValue");
      max = 6;
      test = asciiHexDigit;
      return value;
    }
    effects.enter("characterReferenceValue");
    max = 7;
    test = asciiDigit;
    return value(code);
  }
  function value(code) {
    if (code === 59 && size) {
      const token = effects.exit("characterReferenceValue");
      if (test === asciiAlphanumeric && !decodeNamedCharacterReference(self.sliceSerialize(token))) {
        return nok(code);
      }
      effects.enter("characterReferenceMarker");
      effects.consume(code);
      effects.exit("characterReferenceMarker");
      effects.exit("characterReference");
      return ok;
    }
    if (test(code) && size++ < max) {
      effects.consume(code);
      return value;
    }
    return nok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/code-fenced.js
var nonLazyContinuation = {
  partial: true,
  tokenize: tokenizeNonLazyContinuation
};
var codeFenced = {
  concrete: true,
  name: "codeFenced",
  tokenize: tokenizeCodeFenced
};
function tokenizeCodeFenced(effects, ok, nok) {
  const self = this;
  const closeStart = {
    partial: true,
    tokenize: tokenizeCloseStart
  };
  let initialPrefix = 0;
  let sizeOpen = 0;
  let marker;
  return start;
  function start(code) {
    return beforeSequenceOpen(code);
  }
  function beforeSequenceOpen(code) {
    const tail = self.events[self.events.length - 1];
    initialPrefix = tail && tail[1].type === "linePrefix" ? tail[2].sliceSerialize(tail[1], true).length : 0;
    marker = code;
    effects.enter("codeFenced");
    effects.enter("codeFencedFence");
    effects.enter("codeFencedFenceSequence");
    return sequenceOpen(code);
  }
  function sequenceOpen(code) {
    if (code === marker) {
      sizeOpen++;
      effects.consume(code);
      return sequenceOpen;
    }
    if (sizeOpen < 3) {
      return nok(code);
    }
    effects.exit("codeFencedFenceSequence");
    return markdownSpace(code) ? factorySpace(effects, infoBefore, "whitespace")(code) : infoBefore(code);
  }
  function infoBefore(code) {
    if (code === null || markdownLineEnding(code)) {
      effects.exit("codeFencedFence");
      return self.interrupt ? ok(code) : effects.check(nonLazyContinuation, atNonLazyBreak, after)(code);
    }
    effects.enter("codeFencedFenceInfo");
    effects.enter("chunkString", {
      contentType: "string"
    });
    return info(code);
  }
  function info(code) {
    if (code === null || markdownLineEnding(code)) {
      effects.exit("chunkString");
      effects.exit("codeFencedFenceInfo");
      return infoBefore(code);
    }
    if (markdownSpace(code)) {
      effects.exit("chunkString");
      effects.exit("codeFencedFenceInfo");
      return factorySpace(effects, metaBefore, "whitespace")(code);
    }
    if (code === 96 && code === marker) {
      return nok(code);
    }
    effects.consume(code);
    return info;
  }
  function metaBefore(code) {
    if (code === null || markdownLineEnding(code)) {
      return infoBefore(code);
    }
    effects.enter("codeFencedFenceMeta");
    effects.enter("chunkString", {
      contentType: "string"
    });
    return meta(code);
  }
  function meta(code) {
    if (code === null || markdownLineEnding(code)) {
      effects.exit("chunkString");
      effects.exit("codeFencedFenceMeta");
      return infoBefore(code);
    }
    if (code === 96 && code === marker) {
      return nok(code);
    }
    effects.consume(code);
    return meta;
  }
  function atNonLazyBreak(code) {
    return effects.attempt(closeStart, after, contentBefore)(code);
  }
  function contentBefore(code) {
    effects.enter("lineEnding");
    effects.consume(code);
    effects.exit("lineEnding");
    return contentStart;
  }
  function contentStart(code) {
    return initialPrefix > 0 && markdownSpace(code) ? factorySpace(effects, beforeContentChunk, "linePrefix", initialPrefix + 1)(code) : beforeContentChunk(code);
  }
  function beforeContentChunk(code) {
    if (code === null || markdownLineEnding(code)) {
      return effects.check(nonLazyContinuation, atNonLazyBreak, after)(code);
    }
    effects.enter("codeFlowValue");
    return contentChunk(code);
  }
  function contentChunk(code) {
    if (code === null || markdownLineEnding(code)) {
      effects.exit("codeFlowValue");
      return beforeContentChunk(code);
    }
    effects.consume(code);
    return contentChunk;
  }
  function after(code) {
    effects.exit("codeFenced");
    return ok(code);
  }
  function tokenizeCloseStart(effects2, ok2, nok2) {
    let size = 0;
    return startBefore;
    function startBefore(code) {
      effects2.enter("lineEnding");
      effects2.consume(code);
      effects2.exit("lineEnding");
      return start2;
    }
    function start2(code) {
      effects2.enter("codeFencedFence");
      return markdownSpace(code) ? factorySpace(effects2, beforeSequenceClose, "linePrefix", self.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(code) : beforeSequenceClose(code);
    }
    function beforeSequenceClose(code) {
      if (code === marker) {
        effects2.enter("codeFencedFenceSequence");
        return sequenceClose(code);
      }
      return nok2(code);
    }
    function sequenceClose(code) {
      if (code === marker) {
        size++;
        effects2.consume(code);
        return sequenceClose;
      }
      if (size >= sizeOpen) {
        effects2.exit("codeFencedFenceSequence");
        return markdownSpace(code) ? factorySpace(effects2, sequenceCloseAfter, "whitespace")(code) : sequenceCloseAfter(code);
      }
      return nok2(code);
    }
    function sequenceCloseAfter(code) {
      if (code === null || markdownLineEnding(code)) {
        effects2.exit("codeFencedFence");
        return ok2(code);
      }
      return nok2(code);
    }
  }
}
function tokenizeNonLazyContinuation(effects, ok, nok) {
  const self = this;
  return start;
  function start(code) {
    if (code === null) {
      return nok(code);
    }
    effects.enter("lineEnding");
    effects.consume(code);
    effects.exit("lineEnding");
    return lineStart;
  }
  function lineStart(code) {
    return self.parser.lazy[self.now().line] ? nok(code) : ok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/code-indented.js
var codeIndented = {
  name: "codeIndented",
  tokenize: tokenizeCodeIndented
};
var furtherStart = {
  partial: true,
  tokenize: tokenizeFurtherStart
};
function tokenizeCodeIndented(effects, ok, nok) {
  const self = this;
  return start;
  function start(code) {
    effects.enter("codeIndented");
    return factorySpace(effects, afterPrefix, "linePrefix", 4 + 1)(code);
  }
  function afterPrefix(code) {
    const tail = self.events[self.events.length - 1];
    return tail && tail[1].type === "linePrefix" && tail[2].sliceSerialize(tail[1], true).length >= 4 ? atBreak(code) : nok(code);
  }
  function atBreak(code) {
    if (code === null) {
      return after(code);
    }
    if (markdownLineEnding(code)) {
      return effects.attempt(furtherStart, atBreak, after)(code);
    }
    effects.enter("codeFlowValue");
    return inside(code);
  }
  function inside(code) {
    if (code === null || markdownLineEnding(code)) {
      effects.exit("codeFlowValue");
      return atBreak(code);
    }
    effects.consume(code);
    return inside;
  }
  function after(code) {
    effects.exit("codeIndented");
    return ok(code);
  }
}
function tokenizeFurtherStart(effects, ok, nok) {
  const self = this;
  return furtherStart2;
  function furtherStart2(code) {
    if (self.parser.lazy[self.now().line]) {
      return nok(code);
    }
    if (markdownLineEnding(code)) {
      effects.enter("lineEnding");
      effects.consume(code);
      effects.exit("lineEnding");
      return furtherStart2;
    }
    return factorySpace(effects, afterPrefix, "linePrefix", 4 + 1)(code);
  }
  function afterPrefix(code) {
    const tail = self.events[self.events.length - 1];
    return tail && tail[1].type === "linePrefix" && tail[2].sliceSerialize(tail[1], true).length >= 4 ? ok(code) : markdownLineEnding(code) ? furtherStart2(code) : nok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/code-text.js
var codeText = {
  name: "codeText",
  previous,
  resolve: resolveCodeText,
  tokenize: tokenizeCodeText
};
function resolveCodeText(events) {
  let tailExitIndex = events.length - 4;
  let headEnterIndex = 3;
  let index2;
  let enter;
  if ((events[headEnterIndex][1].type === "lineEnding" || events[headEnterIndex][1].type === "space") && (events[tailExitIndex][1].type === "lineEnding" || events[tailExitIndex][1].type === "space")) {
    index2 = headEnterIndex;
    while (++index2 < tailExitIndex) {
      if (events[index2][1].type === "codeTextData") {
        events[headEnterIndex][1].type = "codeTextPadding";
        events[tailExitIndex][1].type = "codeTextPadding";
        headEnterIndex += 2;
        tailExitIndex -= 2;
        break;
      }
    }
  }
  index2 = headEnterIndex - 1;
  tailExitIndex++;
  while (++index2 <= tailExitIndex) {
    if (enter === void 0) {
      if (index2 !== tailExitIndex && events[index2][1].type !== "lineEnding") {
        enter = index2;
      }
    } else if (index2 === tailExitIndex || events[index2][1].type === "lineEnding") {
      events[enter][1].type = "codeTextData";
      if (index2 !== enter + 2) {
        events[enter][1].end = events[index2 - 1][1].end;
        events.splice(enter + 2, index2 - enter - 2);
        tailExitIndex -= index2 - enter - 2;
        index2 = enter + 2;
      }
      enter = void 0;
    }
  }
  return events;
}
function previous(code) {
  return code !== 96 || this.events[this.events.length - 1][1].type === "characterEscape";
}
function tokenizeCodeText(effects, ok, nok) {
  const self = this;
  let sizeOpen = 0;
  let size;
  let token;
  return start;
  function start(code) {
    effects.enter("codeText");
    effects.enter("codeTextSequence");
    return sequenceOpen(code);
  }
  function sequenceOpen(code) {
    if (code === 96) {
      effects.consume(code);
      sizeOpen++;
      return sequenceOpen;
    }
    effects.exit("codeTextSequence");
    return between(code);
  }
  function between(code) {
    if (code === null) {
      return nok(code);
    }
    if (code === 32) {
      effects.enter("space");
      effects.consume(code);
      effects.exit("space");
      return between;
    }
    if (code === 96) {
      token = effects.enter("codeTextSequence");
      size = 0;
      return sequenceClose(code);
    }
    if (markdownLineEnding(code)) {
      effects.enter("lineEnding");
      effects.consume(code);
      effects.exit("lineEnding");
      return between;
    }
    effects.enter("codeTextData");
    return data(code);
  }
  function data(code) {
    if (code === null || code === 32 || code === 96 || markdownLineEnding(code)) {
      effects.exit("codeTextData");
      return between(code);
    }
    effects.consume(code);
    return data;
  }
  function sequenceClose(code) {
    if (code === 96) {
      effects.consume(code);
      size++;
      return sequenceClose;
    }
    if (size === sizeOpen) {
      effects.exit("codeTextSequence");
      effects.exit("codeText");
      return ok(code);
    }
    token.type = "codeTextData";
    return data(code);
  }
}

// node_modules/micromark-util-subtokenize/lib/splice-buffer.js
var SpliceBuffer = class {
  /**
   * @param {ReadonlyArray<T> | null | undefined} [initial]
   *   Initial items (optional).
   * @returns
   *   Splice buffer.
   */
  constructor(initial) {
    this.left = initial ? [...initial] : [];
    this.right = [];
  }
  /**
   * Array access;
   * does not move the cursor.
   *
   * @param {number} index
   *   Index.
   * @return {T}
   *   Item.
   */
  get(index2) {
    if (index2 < 0 || index2 >= this.left.length + this.right.length) {
      throw new RangeError("Cannot access index `" + index2 + "` in a splice buffer of size `" + (this.left.length + this.right.length) + "`");
    }
    if (index2 < this.left.length) return this.left[index2];
    return this.right[this.right.length - index2 + this.left.length - 1];
  }
  /**
   * The length of the splice buffer, one greater than the largest index in the
   * array.
   */
  get length() {
    return this.left.length + this.right.length;
  }
  /**
   * Remove and return `list[0]`;
   * moves the cursor to `0`.
   *
   * @returns {T | undefined}
   *   Item, optional.
   */
  shift() {
    this.setCursor(0);
    return this.right.pop();
  }
  /**
   * Slice the buffer to get an array;
   * does not move the cursor.
   *
   * @param {number} start
   *   Start.
   * @param {number | null | undefined} [end]
   *   End (optional).
   * @returns {Array<T>}
   *   Array of items.
   */
  slice(start, end) {
    const stop = end === null || end === void 0 ? Number.POSITIVE_INFINITY : end;
    if (stop < this.left.length) {
      return this.left.slice(start, stop);
    }
    if (start > this.left.length) {
      return this.right.slice(this.right.length - stop + this.left.length, this.right.length - start + this.left.length).reverse();
    }
    return this.left.slice(start).concat(this.right.slice(this.right.length - stop + this.left.length).reverse());
  }
  /**
   * Mimics the behavior of Array.prototype.splice() except for the change of
   * interface necessary to avoid segfaults when patching in very large arrays.
   *
   * This operation moves cursor is moved to `start` and results in the cursor
   * placed after any inserted items.
   *
   * @param {number} start
   *   Start;
   *   zero-based index at which to start changing the array;
   *   negative numbers count backwards from the end of the array and values
   *   that are out-of bounds are clamped to the appropriate end of the array.
   * @param {number | null | undefined} [deleteCount=0]
   *   Delete count (default: `0`);
   *   maximum number of elements to delete, starting from start.
   * @param {Array<T> | null | undefined} [items=[]]
   *   Items to include in place of the deleted items (default: `[]`).
   * @return {Array<T>}
   *   Any removed items.
   */
  splice(start, deleteCount, items) {
    const count = deleteCount || 0;
    this.setCursor(Math.trunc(start));
    const removed = this.right.splice(this.right.length - count, Number.POSITIVE_INFINITY);
    if (items) chunkedPush(this.left, items);
    return removed.reverse();
  }
  /**
   * Remove and return the highest-numbered item in the array, so
   * `list[list.length - 1]`;
   * Moves the cursor to `length`.
   *
   * @returns {T | undefined}
   *   Item, optional.
   */
  pop() {
    this.setCursor(Number.POSITIVE_INFINITY);
    return this.left.pop();
  }
  /**
   * Inserts a single item to the high-numbered side of the array;
   * moves the cursor to `length`.
   *
   * @param {T} item
   *   Item.
   * @returns {undefined}
   *   Nothing.
   */
  push(item) {
    this.setCursor(Number.POSITIVE_INFINITY);
    this.left.push(item);
  }
  /**
   * Inserts many items to the high-numbered side of the array.
   * Moves the cursor to `length`.
   *
   * @param {Array<T>} items
   *   Items.
   * @returns {undefined}
   *   Nothing.
   */
  pushMany(items) {
    this.setCursor(Number.POSITIVE_INFINITY);
    chunkedPush(this.left, items);
  }
  /**
   * Inserts a single item to the low-numbered side of the array;
   * Moves the cursor to `0`.
   *
   * @param {T} item
   *   Item.
   * @returns {undefined}
   *   Nothing.
   */
  unshift(item) {
    this.setCursor(0);
    this.right.push(item);
  }
  /**
   * Inserts many items to the low-numbered side of the array;
   * moves the cursor to `0`.
   *
   * @param {Array<T>} items
   *   Items.
   * @returns {undefined}
   *   Nothing.
   */
  unshiftMany(items) {
    this.setCursor(0);
    chunkedPush(this.right, items.reverse());
  }
  /**
   * Move the cursor to a specific position in the array. Requires
   * time proportional to the distance moved.
   *
   * If `n < 0`, the cursor will end up at the beginning.
   * If `n > length`, the cursor will end up at the end.
   *
   * @param {number} n
   *   Position.
   * @return {undefined}
   *   Nothing.
   */
  setCursor(n) {
    if (n === this.left.length || n > this.left.length && this.right.length === 0 || n < 0 && this.left.length === 0) return;
    if (n < this.left.length) {
      const removed = this.left.splice(n, Number.POSITIVE_INFINITY);
      chunkedPush(this.right, removed.reverse());
    } else {
      const removed = this.right.splice(this.left.length + this.right.length - n, Number.POSITIVE_INFINITY);
      chunkedPush(this.left, removed.reverse());
    }
  }
};
function chunkedPush(list2, right) {
  let chunkStart = 0;
  if (right.length < 1e4) {
    list2.push(...right);
  } else {
    while (chunkStart < right.length) {
      list2.push(...right.slice(chunkStart, chunkStart + 1e4));
      chunkStart += 1e4;
    }
  }
}

// node_modules/micromark-util-subtokenize/index.js
function subtokenize(eventsArray) {
  const jumps = {};
  let index2 = -1;
  let event;
  let lineIndex;
  let otherIndex;
  let otherEvent;
  let parameters;
  let subevents;
  let more;
  const events = new SpliceBuffer(eventsArray);
  while (++index2 < events.length) {
    while (index2 in jumps) {
      index2 = jumps[index2];
    }
    event = events.get(index2);
    if (index2 && event[1].type === "chunkFlow" && events.get(index2 - 1)[1].type === "listItemPrefix") {
      subevents = event[1]._tokenizer.events;
      otherIndex = 0;
      if (otherIndex < subevents.length && subevents[otherIndex][1].type === "lineEndingBlank") {
        otherIndex += 2;
      }
      if (otherIndex < subevents.length && subevents[otherIndex][1].type === "content") {
        while (++otherIndex < subevents.length) {
          if (subevents[otherIndex][1].type === "content") {
            break;
          }
          if (subevents[otherIndex][1].type === "chunkText") {
            subevents[otherIndex][1]._isInFirstContentOfListItem = true;
            otherIndex++;
          }
        }
      }
    }
    if (event[0] === "enter") {
      if (event[1].contentType) {
        Object.assign(jumps, subcontent(events, index2));
        index2 = jumps[index2];
        more = true;
      }
    } else if (event[1]._container) {
      otherIndex = index2;
      lineIndex = void 0;
      while (otherIndex--) {
        otherEvent = events.get(otherIndex);
        if (otherEvent[1].type === "lineEnding" || otherEvent[1].type === "lineEndingBlank") {
          if (otherEvent[0] === "enter") {
            if (lineIndex) {
              events.get(lineIndex)[1].type = "lineEndingBlank";
            }
            otherEvent[1].type = "lineEnding";
            lineIndex = otherIndex;
          }
        } else if (otherEvent[1].type === "linePrefix" || otherEvent[1].type === "listItemIndent") {
        } else {
          break;
        }
      }
      if (lineIndex) {
        event[1].end = {
          ...events.get(lineIndex)[1].start
        };
        parameters = events.slice(lineIndex, index2);
        parameters.unshift(event);
        events.splice(lineIndex, index2 - lineIndex + 1, parameters);
      }
    }
  }
  splice(eventsArray, 0, Number.POSITIVE_INFINITY, events.slice(0));
  return !more;
}
function subcontent(events, eventIndex) {
  const token = events.get(eventIndex)[1];
  const context = events.get(eventIndex)[2];
  let startPosition = eventIndex - 1;
  const startPositions = [];
  let tokenizer = token._tokenizer;
  if (!tokenizer) {
    tokenizer = context.parser[token.contentType](token.start);
    if (token._contentTypeTextTrailing) {
      tokenizer._contentTypeTextTrailing = true;
    }
  }
  const childEvents = tokenizer.events;
  const jumps = [];
  const gaps = {};
  let stream;
  let previous2;
  let index2 = -1;
  let current = token;
  let adjust = 0;
  let start = 0;
  const breaks = [start];
  while (current) {
    while (events.get(++startPosition)[1] !== current) {
    }
    startPositions.push(startPosition);
    if (!current._tokenizer) {
      stream = context.sliceStream(current);
      if (!current.next) {
        stream.push(null);
      }
      if (previous2) {
        tokenizer.defineSkip(current.start);
      }
      if (current._isInFirstContentOfListItem) {
        tokenizer._gfmTasklistFirstContentOfListItem = true;
      }
      tokenizer.write(stream);
      if (current._isInFirstContentOfListItem) {
        tokenizer._gfmTasklistFirstContentOfListItem = void 0;
      }
    }
    previous2 = current;
    current = current.next;
  }
  current = token;
  while (++index2 < childEvents.length) {
    if (
      // Find a void token that includes a break.
      childEvents[index2][0] === "exit" && childEvents[index2 - 1][0] === "enter" && childEvents[index2][1].type === childEvents[index2 - 1][1].type && childEvents[index2][1].start.line !== childEvents[index2][1].end.line
    ) {
      start = index2 + 1;
      breaks.push(start);
      current._tokenizer = void 0;
      current.previous = void 0;
      current = current.next;
    }
  }
  tokenizer.events = [];
  if (current) {
    current._tokenizer = void 0;
    current.previous = void 0;
  } else {
    breaks.pop();
  }
  index2 = breaks.length;
  while (index2--) {
    const slice = childEvents.slice(breaks[index2], breaks[index2 + 1]);
    const start2 = startPositions.pop();
    jumps.push([start2, start2 + slice.length - 1]);
    events.splice(start2, 2, slice);
  }
  jumps.reverse();
  index2 = -1;
  while (++index2 < jumps.length) {
    gaps[adjust + jumps[index2][0]] = adjust + jumps[index2][1];
    adjust += jumps[index2][1] - jumps[index2][0] - 1;
  }
  return gaps;
}

// node_modules/micromark-core-commonmark/lib/content.js
var content2 = {
  resolve: resolveContent,
  tokenize: tokenizeContent
};
var continuationConstruct = {
  partial: true,
  tokenize: tokenizeContinuation
};
function resolveContent(events) {
  subtokenize(events);
  return events;
}
function tokenizeContent(effects, ok) {
  let previous2;
  return chunkStart;
  function chunkStart(code) {
    effects.enter("content");
    previous2 = effects.enter("chunkContent", {
      contentType: "content"
    });
    return chunkInside(code);
  }
  function chunkInside(code) {
    if (code === null) {
      return contentEnd(code);
    }
    if (markdownLineEnding(code)) {
      return effects.check(continuationConstruct, contentContinue, contentEnd)(code);
    }
    effects.consume(code);
    return chunkInside;
  }
  function contentEnd(code) {
    effects.exit("chunkContent");
    effects.exit("content");
    return ok(code);
  }
  function contentContinue(code) {
    effects.consume(code);
    effects.exit("chunkContent");
    previous2.next = effects.enter("chunkContent", {
      contentType: "content",
      previous: previous2
    });
    previous2 = previous2.next;
    return chunkInside;
  }
}
function tokenizeContinuation(effects, ok, nok) {
  const self = this;
  return startLookahead;
  function startLookahead(code) {
    effects.exit("chunkContent");
    effects.enter("lineEnding");
    effects.consume(code);
    effects.exit("lineEnding");
    return factorySpace(effects, prefixed, "linePrefix");
  }
  function prefixed(code) {
    if (code === null || markdownLineEnding(code)) {
      return nok(code);
    }
    const tail = self.events[self.events.length - 1];
    if (!self.parser.constructs.disable.null.includes("codeIndented") && tail && tail[1].type === "linePrefix" && tail[2].sliceSerialize(tail[1], true).length >= 4) {
      return ok(code);
    }
    return effects.interrupt(self.parser.constructs.flow, nok, ok)(code);
  }
}

// node_modules/micromark-factory-destination/index.js
function factoryDestination(effects, ok, nok, type, literalType, literalMarkerType, rawType, stringType, max) {
  const limit = max || Number.POSITIVE_INFINITY;
  let balance = 0;
  return start;
  function start(code) {
    if (code === 60) {
      effects.enter(type);
      effects.enter(literalType);
      effects.enter(literalMarkerType);
      effects.consume(code);
      effects.exit(literalMarkerType);
      return enclosedBefore;
    }
    if (code === null || code === 32 || code === 41 || asciiControl(code)) {
      return nok(code);
    }
    effects.enter(type);
    effects.enter(rawType);
    effects.enter(stringType);
    effects.enter("chunkString", {
      contentType: "string"
    });
    return raw(code);
  }
  function enclosedBefore(code) {
    if (code === 62) {
      effects.enter(literalMarkerType);
      effects.consume(code);
      effects.exit(literalMarkerType);
      effects.exit(literalType);
      effects.exit(type);
      return ok;
    }
    effects.enter(stringType);
    effects.enter("chunkString", {
      contentType: "string"
    });
    return enclosed(code);
  }
  function enclosed(code) {
    if (code === 62) {
      effects.exit("chunkString");
      effects.exit(stringType);
      return enclosedBefore(code);
    }
    if (code === null || code === 60 || markdownLineEnding(code)) {
      return nok(code);
    }
    effects.consume(code);
    return code === 92 ? enclosedEscape : enclosed;
  }
  function enclosedEscape(code) {
    if (code === 60 || code === 62 || code === 92) {
      effects.consume(code);
      return enclosed;
    }
    return enclosed(code);
  }
  function raw(code) {
    if (!balance && (code === null || code === 41 || markdownLineEndingOrSpace(code))) {
      effects.exit("chunkString");
      effects.exit(stringType);
      effects.exit(rawType);
      effects.exit(type);
      return ok(code);
    }
    if (balance < limit && code === 40) {
      effects.consume(code);
      balance++;
      return raw;
    }
    if (code === 41) {
      effects.consume(code);
      balance--;
      return raw;
    }
    if (code === null || code === 32 || code === 40 || asciiControl(code)) {
      return nok(code);
    }
    effects.consume(code);
    return code === 92 ? rawEscape : raw;
  }
  function rawEscape(code) {
    if (code === 40 || code === 41 || code === 92) {
      effects.consume(code);
      return raw;
    }
    return raw(code);
  }
}

// node_modules/micromark-factory-label/index.js
function factoryLabel(effects, ok, nok, type, markerType, stringType) {
  const self = this;
  let size = 0;
  let seen;
  return start;
  function start(code) {
    effects.enter(type);
    effects.enter(markerType);
    effects.consume(code);
    effects.exit(markerType);
    effects.enter(stringType);
    return atBreak;
  }
  function atBreak(code) {
    if (size > 999 || code === null || code === 91 || code === 93 && !seen || // To do: remove in the future once we’ve switched from
    // `micromark-extension-footnote` to `micromark-extension-gfm-footnote`,
    // which doesn’t need this.
    // Hidden footnotes hook.
    /* c8 ignore next 3 */
    code === 94 && !size && "_hiddenFootnoteSupport" in self.parser.constructs) {
      return nok(code);
    }
    if (code === 93) {
      effects.exit(stringType);
      effects.enter(markerType);
      effects.consume(code);
      effects.exit(markerType);
      effects.exit(type);
      return ok;
    }
    if (markdownLineEnding(code)) {
      effects.enter("lineEnding");
      effects.consume(code);
      effects.exit("lineEnding");
      return atBreak;
    }
    effects.enter("chunkString", {
      contentType: "string"
    });
    return labelInside(code);
  }
  function labelInside(code) {
    if (code === null || code === 91 || code === 93 || markdownLineEnding(code) || size++ > 999) {
      effects.exit("chunkString");
      return atBreak(code);
    }
    effects.consume(code);
    if (!seen) seen = !markdownSpace(code);
    return code === 92 ? labelEscape : labelInside;
  }
  function labelEscape(code) {
    if (code === 91 || code === 92 || code === 93) {
      effects.consume(code);
      size++;
      return labelInside;
    }
    return labelInside(code);
  }
}

// node_modules/micromark-factory-title/index.js
function factoryTitle(effects, ok, nok, type, markerType, stringType) {
  let marker;
  return start;
  function start(code) {
    if (code === 34 || code === 39 || code === 40) {
      effects.enter(type);
      effects.enter(markerType);
      effects.consume(code);
      effects.exit(markerType);
      marker = code === 40 ? 41 : code;
      return begin;
    }
    return nok(code);
  }
  function begin(code) {
    if (code === marker) {
      effects.enter(markerType);
      effects.consume(code);
      effects.exit(markerType);
      effects.exit(type);
      return ok;
    }
    effects.enter(stringType);
    return atBreak(code);
  }
  function atBreak(code) {
    if (code === marker) {
      effects.exit(stringType);
      return begin(marker);
    }
    if (code === null) {
      return nok(code);
    }
    if (markdownLineEnding(code)) {
      effects.enter("lineEnding");
      effects.consume(code);
      effects.exit("lineEnding");
      return factorySpace(effects, atBreak, "linePrefix");
    }
    effects.enter("chunkString", {
      contentType: "string"
    });
    return inside(code);
  }
  function inside(code) {
    if (code === marker || code === null || markdownLineEnding(code)) {
      effects.exit("chunkString");
      return atBreak(code);
    }
    effects.consume(code);
    return code === 92 ? escape : inside;
  }
  function escape(code) {
    if (code === marker || code === 92) {
      effects.consume(code);
      return inside;
    }
    return inside(code);
  }
}

// node_modules/micromark-factory-whitespace/index.js
function factoryWhitespace(effects, ok) {
  let seen;
  return start;
  function start(code) {
    if (markdownLineEnding(code)) {
      effects.enter("lineEnding");
      effects.consume(code);
      effects.exit("lineEnding");
      seen = true;
      return start;
    }
    if (markdownSpace(code)) {
      return factorySpace(effects, start, seen ? "linePrefix" : "lineSuffix")(code);
    }
    return ok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/definition.js
var definition = {
  name: "definition",
  tokenize: tokenizeDefinition
};
var titleBefore = {
  partial: true,
  tokenize: tokenizeTitleBefore
};
function tokenizeDefinition(effects, ok, nok) {
  const self = this;
  let identifier;
  return start;
  function start(code) {
    effects.enter("definition");
    return before(code);
  }
  function before(code) {
    return factoryLabel.call(
      self,
      effects,
      labelAfter,
      // Note: we don’t need to reset the way `markdown-rs` does.
      nok,
      "definitionLabel",
      "definitionLabelMarker",
      "definitionLabelString"
    )(code);
  }
  function labelAfter(code) {
    identifier = normalizeIdentifier(self.sliceSerialize(self.events[self.events.length - 1][1]).slice(1, -1));
    if (code === 58) {
      effects.enter("definitionMarker");
      effects.consume(code);
      effects.exit("definitionMarker");
      return markerAfter;
    }
    return nok(code);
  }
  function markerAfter(code) {
    return markdownLineEndingOrSpace(code) ? factoryWhitespace(effects, destinationBefore)(code) : destinationBefore(code);
  }
  function destinationBefore(code) {
    return factoryDestination(
      effects,
      destinationAfter,
      // Note: we don’t need to reset the way `markdown-rs` does.
      nok,
      "definitionDestination",
      "definitionDestinationLiteral",
      "definitionDestinationLiteralMarker",
      "definitionDestinationRaw",
      "definitionDestinationString"
    )(code);
  }
  function destinationAfter(code) {
    return effects.attempt(titleBefore, after, after)(code);
  }
  function after(code) {
    return markdownSpace(code) ? factorySpace(effects, afterWhitespace, "whitespace")(code) : afterWhitespace(code);
  }
  function afterWhitespace(code) {
    if (code === null || markdownLineEnding(code)) {
      effects.exit("definition");
      self.parser.defined.push(identifier);
      return ok(code);
    }
    return nok(code);
  }
}
function tokenizeTitleBefore(effects, ok, nok) {
  return titleBefore2;
  function titleBefore2(code) {
    return markdownLineEndingOrSpace(code) ? factoryWhitespace(effects, beforeMarker)(code) : nok(code);
  }
  function beforeMarker(code) {
    return factoryTitle(effects, titleAfter, nok, "definitionTitle", "definitionTitleMarker", "definitionTitleString")(code);
  }
  function titleAfter(code) {
    return markdownSpace(code) ? factorySpace(effects, titleAfterOptionalWhitespace, "whitespace")(code) : titleAfterOptionalWhitespace(code);
  }
  function titleAfterOptionalWhitespace(code) {
    return code === null || markdownLineEnding(code) ? ok(code) : nok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/hard-break-escape.js
var hardBreakEscape = {
  name: "hardBreakEscape",
  tokenize: tokenizeHardBreakEscape
};
function tokenizeHardBreakEscape(effects, ok, nok) {
  return start;
  function start(code) {
    effects.enter("hardBreakEscape");
    effects.consume(code);
    return after;
  }
  function after(code) {
    if (markdownLineEnding(code)) {
      effects.exit("hardBreakEscape");
      return ok(code);
    }
    return nok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/heading-atx.js
var headingAtx = {
  name: "headingAtx",
  resolve: resolveHeadingAtx,
  tokenize: tokenizeHeadingAtx
};
function resolveHeadingAtx(events, context) {
  let contentEnd = events.length - 2;
  let contentStart = 3;
  let content3;
  let text3;
  if (events[contentStart][1].type === "whitespace") {
    contentStart += 2;
  }
  if (contentEnd - 2 > contentStart && events[contentEnd][1].type === "whitespace") {
    contentEnd -= 2;
  }
  if (events[contentEnd][1].type === "atxHeadingSequence" && (contentStart === contentEnd - 1 || contentEnd - 4 > contentStart && events[contentEnd - 2][1].type === "whitespace")) {
    contentEnd -= contentStart + 1 === contentEnd ? 2 : 4;
  }
  if (contentEnd > contentStart) {
    content3 = {
      type: "atxHeadingText",
      start: events[contentStart][1].start,
      end: events[contentEnd][1].end
    };
    text3 = {
      type: "chunkText",
      start: events[contentStart][1].start,
      end: events[contentEnd][1].end,
      contentType: "text"
    };
    splice(events, contentStart, contentEnd - contentStart + 1, [["enter", content3, context], ["enter", text3, context], ["exit", text3, context], ["exit", content3, context]]);
  }
  return events;
}
function tokenizeHeadingAtx(effects, ok, nok) {
  let size = 0;
  return start;
  function start(code) {
    effects.enter("atxHeading");
    return before(code);
  }
  function before(code) {
    effects.enter("atxHeadingSequence");
    return sequenceOpen(code);
  }
  function sequenceOpen(code) {
    if (code === 35 && size++ < 6) {
      effects.consume(code);
      return sequenceOpen;
    }
    if (code === null || markdownLineEndingOrSpace(code)) {
      effects.exit("atxHeadingSequence");
      return atBreak(code);
    }
    return nok(code);
  }
  function atBreak(code) {
    if (code === 35) {
      effects.enter("atxHeadingSequence");
      return sequenceFurther(code);
    }
    if (code === null || markdownLineEnding(code)) {
      effects.exit("atxHeading");
      return ok(code);
    }
    if (markdownSpace(code)) {
      return factorySpace(effects, atBreak, "whitespace")(code);
    }
    effects.enter("atxHeadingText");
    return data(code);
  }
  function sequenceFurther(code) {
    if (code === 35) {
      effects.consume(code);
      return sequenceFurther;
    }
    effects.exit("atxHeadingSequence");
    return atBreak(code);
  }
  function data(code) {
    if (code === null || code === 35 || markdownLineEndingOrSpace(code)) {
      effects.exit("atxHeadingText");
      return atBreak(code);
    }
    effects.consume(code);
    return data;
  }
}

// node_modules/micromark-util-html-tag-name/index.js
var htmlBlockNames = [
  "address",
  "article",
  "aside",
  "base",
  "basefont",
  "blockquote",
  "body",
  "caption",
  "center",
  "col",
  "colgroup",
  "dd",
  "details",
  "dialog",
  "dir",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "frame",
  "frameset",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hr",
  "html",
  "iframe",
  "legend",
  "li",
  "link",
  "main",
  "menu",
  "menuitem",
  "nav",
  "noframes",
  "ol",
  "optgroup",
  "option",
  "p",
  "param",
  "search",
  "section",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "title",
  "tr",
  "track",
  "ul"
];
var htmlRawNames = ["pre", "script", "style", "textarea"];

// node_modules/micromark-core-commonmark/lib/html-flow.js
var htmlFlow = {
  concrete: true,
  name: "htmlFlow",
  resolveTo: resolveToHtmlFlow,
  tokenize: tokenizeHtmlFlow
};
var blankLineBefore = {
  partial: true,
  tokenize: tokenizeBlankLineBefore
};
var nonLazyContinuationStart = {
  partial: true,
  tokenize: tokenizeNonLazyContinuationStart
};
function resolveToHtmlFlow(events) {
  let index2 = events.length;
  while (index2--) {
    if (events[index2][0] === "enter" && events[index2][1].type === "htmlFlow") {
      break;
    }
  }
  if (index2 > 1 && events[index2 - 2][1].type === "linePrefix") {
    events[index2][1].start = events[index2 - 2][1].start;
    events[index2 + 1][1].start = events[index2 - 2][1].start;
    events.splice(index2 - 2, 2);
  }
  return events;
}
function tokenizeHtmlFlow(effects, ok, nok) {
  const self = this;
  let marker;
  let closingTag;
  let buffer;
  let index2;
  let markerB;
  return start;
  function start(code) {
    return before(code);
  }
  function before(code) {
    effects.enter("htmlFlow");
    effects.enter("htmlFlowData");
    effects.consume(code);
    return open;
  }
  function open(code) {
    if (code === 33) {
      effects.consume(code);
      return declarationOpen;
    }
    if (code === 47) {
      effects.consume(code);
      closingTag = true;
      return tagCloseStart;
    }
    if (code === 63) {
      effects.consume(code);
      marker = 3;
      return self.interrupt ? ok : continuationDeclarationInside;
    }
    if (asciiAlpha(code)) {
      effects.consume(code);
      buffer = String.fromCharCode(code);
      return tagName;
    }
    return nok(code);
  }
  function declarationOpen(code) {
    if (code === 45) {
      effects.consume(code);
      marker = 2;
      return commentOpenInside;
    }
    if (code === 91) {
      effects.consume(code);
      marker = 5;
      index2 = 0;
      return cdataOpenInside;
    }
    if (asciiAlpha(code)) {
      effects.consume(code);
      marker = 4;
      return self.interrupt ? ok : continuationDeclarationInside;
    }
    return nok(code);
  }
  function commentOpenInside(code) {
    if (code === 45) {
      effects.consume(code);
      return self.interrupt ? ok : continuationDeclarationInside;
    }
    return nok(code);
  }
  function cdataOpenInside(code) {
    const value = "CDATA[";
    if (code === value.charCodeAt(index2++)) {
      effects.consume(code);
      if (index2 === value.length) {
        return self.interrupt ? ok : continuation;
      }
      return cdataOpenInside;
    }
    return nok(code);
  }
  function tagCloseStart(code) {
    if (asciiAlpha(code)) {
      effects.consume(code);
      buffer = String.fromCharCode(code);
      return tagName;
    }
    return nok(code);
  }
  function tagName(code) {
    if (code === null || code === 47 || code === 62 || markdownLineEndingOrSpace(code)) {
      const slash = code === 47;
      const name = buffer.toLowerCase();
      if (!slash && !closingTag && htmlRawNames.includes(name)) {
        marker = 1;
        return self.interrupt ? ok(code) : continuation(code);
      }
      if (htmlBlockNames.includes(buffer.toLowerCase())) {
        marker = 6;
        if (slash) {
          effects.consume(code);
          return basicSelfClosing;
        }
        return self.interrupt ? ok(code) : continuation(code);
      }
      marker = 7;
      return self.interrupt && !self.parser.lazy[self.now().line] ? nok(code) : closingTag ? completeClosingTagAfter(code) : completeAttributeNameBefore(code);
    }
    if (code === 45 || asciiAlphanumeric(code)) {
      effects.consume(code);
      buffer += String.fromCharCode(code);
      return tagName;
    }
    return nok(code);
  }
  function basicSelfClosing(code) {
    if (code === 62) {
      effects.consume(code);
      return self.interrupt ? ok : continuation;
    }
    return nok(code);
  }
  function completeClosingTagAfter(code) {
    if (markdownSpace(code)) {
      effects.consume(code);
      return completeClosingTagAfter;
    }
    return completeEnd(code);
  }
  function completeAttributeNameBefore(code) {
    if (code === 47) {
      effects.consume(code);
      return completeEnd;
    }
    if (code === 58 || code === 95 || asciiAlpha(code)) {
      effects.consume(code);
      return completeAttributeName;
    }
    if (markdownSpace(code)) {
      effects.consume(code);
      return completeAttributeNameBefore;
    }
    return completeEnd(code);
  }
  function completeAttributeName(code) {
    if (code === 45 || code === 46 || code === 58 || code === 95 || asciiAlphanumeric(code)) {
      effects.consume(code);
      return completeAttributeName;
    }
    return completeAttributeNameAfter(code);
  }
  function completeAttributeNameAfter(code) {
    if (code === 61) {
      effects.consume(code);
      return completeAttributeValueBefore;
    }
    if (markdownSpace(code)) {
      effects.consume(code);
      return completeAttributeNameAfter;
    }
    return completeAttributeNameBefore(code);
  }
  function completeAttributeValueBefore(code) {
    if (code === null || code === 60 || code === 61 || code === 62 || code === 96) {
      return nok(code);
    }
    if (code === 34 || code === 39) {
      effects.consume(code);
      markerB = code;
      return completeAttributeValueQuoted;
    }
    if (markdownSpace(code)) {
      effects.consume(code);
      return completeAttributeValueBefore;
    }
    return completeAttributeValueUnquoted(code);
  }
  function completeAttributeValueQuoted(code) {
    if (code === markerB) {
      effects.consume(code);
      markerB = null;
      return completeAttributeValueQuotedAfter;
    }
    if (code === null || markdownLineEnding(code)) {
      return nok(code);
    }
    effects.consume(code);
    return completeAttributeValueQuoted;
  }
  function completeAttributeValueUnquoted(code) {
    if (code === null || code === 34 || code === 39 || code === 47 || code === 60 || code === 61 || code === 62 || code === 96 || markdownLineEndingOrSpace(code)) {
      return completeAttributeNameAfter(code);
    }
    effects.consume(code);
    return completeAttributeValueUnquoted;
  }
  function completeAttributeValueQuotedAfter(code) {
    if (code === 47 || code === 62 || markdownSpace(code)) {
      return completeAttributeNameBefore(code);
    }
    return nok(code);
  }
  function completeEnd(code) {
    if (code === 62) {
      effects.consume(code);
      return completeAfter;
    }
    return nok(code);
  }
  function completeAfter(code) {
    if (code === null || markdownLineEnding(code)) {
      return continuation(code);
    }
    if (markdownSpace(code)) {
      effects.consume(code);
      return completeAfter;
    }
    return nok(code);
  }
  function continuation(code) {
    if (code === 45 && marker === 2) {
      effects.consume(code);
      return continuationCommentInside;
    }
    if (code === 60 && marker === 1) {
      effects.consume(code);
      return continuationRawTagOpen;
    }
    if (code === 62 && marker === 4) {
      effects.consume(code);
      return continuationClose;
    }
    if (code === 63 && marker === 3) {
      effects.consume(code);
      return continuationDeclarationInside;
    }
    if (code === 93 && marker === 5) {
      effects.consume(code);
      return continuationCdataInside;
    }
    if (markdownLineEnding(code) && (marker === 6 || marker === 7)) {
      effects.exit("htmlFlowData");
      return effects.check(blankLineBefore, continuationAfter, continuationStart)(code);
    }
    if (code === null || markdownLineEnding(code)) {
      effects.exit("htmlFlowData");
      return continuationStart(code);
    }
    effects.consume(code);
    return continuation;
  }
  function continuationStart(code) {
    return effects.check(nonLazyContinuationStart, continuationStartNonLazy, continuationAfter)(code);
  }
  function continuationStartNonLazy(code) {
    effects.enter("lineEnding");
    effects.consume(code);
    effects.exit("lineEnding");
    return continuationBefore;
  }
  function continuationBefore(code) {
    if (code === null || markdownLineEnding(code)) {
      return continuationStart(code);
    }
    effects.enter("htmlFlowData");
    return continuation(code);
  }
  function continuationCommentInside(code) {
    if (code === 45) {
      effects.consume(code);
      return continuationDeclarationInside;
    }
    return continuation(code);
  }
  function continuationRawTagOpen(code) {
    if (code === 47) {
      effects.consume(code);
      buffer = "";
      return continuationRawEndTag;
    }
    return continuation(code);
  }
  function continuationRawEndTag(code) {
    if (code === 62) {
      const name = buffer.toLowerCase();
      if (htmlRawNames.includes(name)) {
        effects.consume(code);
        return continuationClose;
      }
      return continuation(code);
    }
    if (asciiAlpha(code) && buffer.length < 8) {
      effects.consume(code);
      buffer += String.fromCharCode(code);
      return continuationRawEndTag;
    }
    return continuation(code);
  }
  function continuationCdataInside(code) {
    if (code === 93) {
      effects.consume(code);
      return continuationDeclarationInside;
    }
    return continuation(code);
  }
  function continuationDeclarationInside(code) {
    if (code === 62) {
      effects.consume(code);
      return continuationClose;
    }
    if (code === 45 && marker === 2) {
      effects.consume(code);
      return continuationDeclarationInside;
    }
    return continuation(code);
  }
  function continuationClose(code) {
    if (code === null || markdownLineEnding(code)) {
      effects.exit("htmlFlowData");
      return continuationAfter(code);
    }
    effects.consume(code);
    return continuationClose;
  }
  function continuationAfter(code) {
    effects.exit("htmlFlow");
    return ok(code);
  }
}
function tokenizeNonLazyContinuationStart(effects, ok, nok) {
  const self = this;
  return start;
  function start(code) {
    if (markdownLineEnding(code)) {
      effects.enter("lineEnding");
      effects.consume(code);
      effects.exit("lineEnding");
      return after;
    }
    return nok(code);
  }
  function after(code) {
    return self.parser.lazy[self.now().line] ? nok(code) : ok(code);
  }
}
function tokenizeBlankLineBefore(effects, ok, nok) {
  return start;
  function start(code) {
    effects.enter("lineEnding");
    effects.consume(code);
    effects.exit("lineEnding");
    return effects.attempt(blankLine, ok, nok);
  }
}

// node_modules/micromark-core-commonmark/lib/html-text.js
var htmlText = {
  name: "htmlText",
  tokenize: tokenizeHtmlText
};
function tokenizeHtmlText(effects, ok, nok) {
  const self = this;
  let marker;
  let index2;
  let returnState;
  return start;
  function start(code) {
    effects.enter("htmlText");
    effects.enter("htmlTextData");
    effects.consume(code);
    return open;
  }
  function open(code) {
    if (code === 33) {
      effects.consume(code);
      return declarationOpen;
    }
    if (code === 47) {
      effects.consume(code);
      return tagCloseStart;
    }
    if (code === 63) {
      effects.consume(code);
      return instruction;
    }
    if (asciiAlpha(code)) {
      effects.consume(code);
      return tagOpen;
    }
    return nok(code);
  }
  function declarationOpen(code) {
    if (code === 45) {
      effects.consume(code);
      return commentOpenInside;
    }
    if (code === 91) {
      effects.consume(code);
      index2 = 0;
      return cdataOpenInside;
    }
    if (asciiAlpha(code)) {
      effects.consume(code);
      return declaration;
    }
    return nok(code);
  }
  function commentOpenInside(code) {
    if (code === 45) {
      effects.consume(code);
      return commentEnd;
    }
    return nok(code);
  }
  function comment(code) {
    if (code === null) {
      return nok(code);
    }
    if (code === 45) {
      effects.consume(code);
      return commentClose;
    }
    if (markdownLineEnding(code)) {
      returnState = comment;
      return lineEndingBefore(code);
    }
    effects.consume(code);
    return comment;
  }
  function commentClose(code) {
    if (code === 45) {
      effects.consume(code);
      return commentEnd;
    }
    return comment(code);
  }
  function commentEnd(code) {
    return code === 62 ? end(code) : code === 45 ? commentClose(code) : comment(code);
  }
  function cdataOpenInside(code) {
    const value = "CDATA[";
    if (code === value.charCodeAt(index2++)) {
      effects.consume(code);
      return index2 === value.length ? cdata : cdataOpenInside;
    }
    return nok(code);
  }
  function cdata(code) {
    if (code === null) {
      return nok(code);
    }
    if (code === 93) {
      effects.consume(code);
      return cdataClose;
    }
    if (markdownLineEnding(code)) {
      returnState = cdata;
      return lineEndingBefore(code);
    }
    effects.consume(code);
    return cdata;
  }
  function cdataClose(code) {
    if (code === 93) {
      effects.consume(code);
      return cdataEnd;
    }
    return cdata(code);
  }
  function cdataEnd(code) {
    if (code === 62) {
      return end(code);
    }
    if (code === 93) {
      effects.consume(code);
      return cdataEnd;
    }
    return cdata(code);
  }
  function declaration(code) {
    if (code === null || code === 62) {
      return end(code);
    }
    if (markdownLineEnding(code)) {
      returnState = declaration;
      return lineEndingBefore(code);
    }
    effects.consume(code);
    return declaration;
  }
  function instruction(code) {
    if (code === null) {
      return nok(code);
    }
    if (code === 63) {
      effects.consume(code);
      return instructionClose;
    }
    if (markdownLineEnding(code)) {
      returnState = instruction;
      return lineEndingBefore(code);
    }
    effects.consume(code);
    return instruction;
  }
  function instructionClose(code) {
    return code === 62 ? end(code) : instruction(code);
  }
  function tagCloseStart(code) {
    if (asciiAlpha(code)) {
      effects.consume(code);
      return tagClose;
    }
    return nok(code);
  }
  function tagClose(code) {
    if (code === 45 || asciiAlphanumeric(code)) {
      effects.consume(code);
      return tagClose;
    }
    return tagCloseBetween(code);
  }
  function tagCloseBetween(code) {
    if (markdownLineEnding(code)) {
      returnState = tagCloseBetween;
      return lineEndingBefore(code);
    }
    if (markdownSpace(code)) {
      effects.consume(code);
      return tagCloseBetween;
    }
    return end(code);
  }
  function tagOpen(code) {
    if (code === 45 || asciiAlphanumeric(code)) {
      effects.consume(code);
      return tagOpen;
    }
    if (code === 47 || code === 62 || markdownLineEndingOrSpace(code)) {
      return tagOpenBetween(code);
    }
    return nok(code);
  }
  function tagOpenBetween(code) {
    if (code === 47) {
      effects.consume(code);
      return end;
    }
    if (code === 58 || code === 95 || asciiAlpha(code)) {
      effects.consume(code);
      return tagOpenAttributeName;
    }
    if (markdownLineEnding(code)) {
      returnState = tagOpenBetween;
      return lineEndingBefore(code);
    }
    if (markdownSpace(code)) {
      effects.consume(code);
      return tagOpenBetween;
    }
    return end(code);
  }
  function tagOpenAttributeName(code) {
    if (code === 45 || code === 46 || code === 58 || code === 95 || asciiAlphanumeric(code)) {
      effects.consume(code);
      return tagOpenAttributeName;
    }
    return tagOpenAttributeNameAfter(code);
  }
  function tagOpenAttributeNameAfter(code) {
    if (code === 61) {
      effects.consume(code);
      return tagOpenAttributeValueBefore;
    }
    if (markdownLineEnding(code)) {
      returnState = tagOpenAttributeNameAfter;
      return lineEndingBefore(code);
    }
    if (markdownSpace(code)) {
      effects.consume(code);
      return tagOpenAttributeNameAfter;
    }
    return tagOpenBetween(code);
  }
  function tagOpenAttributeValueBefore(code) {
    if (code === null || code === 60 || code === 61 || code === 62 || code === 96) {
      return nok(code);
    }
    if (code === 34 || code === 39) {
      effects.consume(code);
      marker = code;
      return tagOpenAttributeValueQuoted;
    }
    if (markdownLineEnding(code)) {
      returnState = tagOpenAttributeValueBefore;
      return lineEndingBefore(code);
    }
    if (markdownSpace(code)) {
      effects.consume(code);
      return tagOpenAttributeValueBefore;
    }
    effects.consume(code);
    return tagOpenAttributeValueUnquoted;
  }
  function tagOpenAttributeValueQuoted(code) {
    if (code === marker) {
      effects.consume(code);
      marker = void 0;
      return tagOpenAttributeValueQuotedAfter;
    }
    if (code === null) {
      return nok(code);
    }
    if (markdownLineEnding(code)) {
      returnState = tagOpenAttributeValueQuoted;
      return lineEndingBefore(code);
    }
    effects.consume(code);
    return tagOpenAttributeValueQuoted;
  }
  function tagOpenAttributeValueUnquoted(code) {
    if (code === null || code === 34 || code === 39 || code === 60 || code === 61 || code === 96) {
      return nok(code);
    }
    if (code === 47 || code === 62 || markdownLineEndingOrSpace(code)) {
      return tagOpenBetween(code);
    }
    effects.consume(code);
    return tagOpenAttributeValueUnquoted;
  }
  function tagOpenAttributeValueQuotedAfter(code) {
    if (code === 47 || code === 62 || markdownLineEndingOrSpace(code)) {
      return tagOpenBetween(code);
    }
    return nok(code);
  }
  function end(code) {
    if (code === 62) {
      effects.consume(code);
      effects.exit("htmlTextData");
      effects.exit("htmlText");
      return ok;
    }
    return nok(code);
  }
  function lineEndingBefore(code) {
    effects.exit("htmlTextData");
    effects.enter("lineEnding");
    effects.consume(code);
    effects.exit("lineEnding");
    return lineEndingAfter;
  }
  function lineEndingAfter(code) {
    return markdownSpace(code) ? factorySpace(effects, lineEndingAfterPrefix, "linePrefix", self.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(code) : lineEndingAfterPrefix(code);
  }
  function lineEndingAfterPrefix(code) {
    effects.enter("htmlTextData");
    return returnState(code);
  }
}

// node_modules/micromark-core-commonmark/lib/label-end.js
var labelEnd = {
  name: "labelEnd",
  resolveAll: resolveAllLabelEnd,
  resolveTo: resolveToLabelEnd,
  tokenize: tokenizeLabelEnd
};
var resourceConstruct = {
  tokenize: tokenizeResource
};
var referenceFullConstruct = {
  tokenize: tokenizeReferenceFull
};
var referenceCollapsedConstruct = {
  tokenize: tokenizeReferenceCollapsed
};
function resolveAllLabelEnd(events) {
  let index2 = -1;
  const newEvents = [];
  while (++index2 < events.length) {
    const token = events[index2][1];
    newEvents.push(events[index2]);
    if (token.type === "labelImage" || token.type === "labelLink" || token.type === "labelEnd") {
      const offset = token.type === "labelImage" ? 4 : 2;
      token.type = "data";
      index2 += offset;
    }
  }
  if (events.length !== newEvents.length) {
    splice(events, 0, events.length, newEvents);
  }
  return events;
}
function resolveToLabelEnd(events, context) {
  let index2 = events.length;
  let offset = 0;
  let token;
  let open;
  let close;
  let media;
  while (index2--) {
    token = events[index2][1];
    if (open) {
      if (token.type === "link" || token.type === "labelLink" && token._inactive) {
        break;
      }
      if (events[index2][0] === "enter" && token.type === "labelLink") {
        token._inactive = true;
      }
    } else if (close) {
      if (events[index2][0] === "enter" && (token.type === "labelImage" || token.type === "labelLink") && !token._balanced) {
        open = index2;
        if (token.type !== "labelLink") {
          offset = 2;
          break;
        }
      }
    } else if (token.type === "labelEnd") {
      close = index2;
    }
  }
  const group = {
    type: events[open][1].type === "labelLink" ? "link" : "image",
    start: {
      ...events[open][1].start
    },
    end: {
      ...events[events.length - 1][1].end
    }
  };
  const label = {
    type: "label",
    start: {
      ...events[open][1].start
    },
    end: {
      ...events[close][1].end
    }
  };
  const text3 = {
    type: "labelText",
    start: {
      ...events[open + offset + 2][1].end
    },
    end: {
      ...events[close - 2][1].start
    }
  };
  media = [["enter", group, context], ["enter", label, context]];
  media = push(media, events.slice(open + 1, open + offset + 3));
  media = push(media, [["enter", text3, context]]);
  media = push(media, resolveAll(context.parser.constructs.insideSpan.null, events.slice(open + offset + 4, close - 3), context));
  media = push(media, [["exit", text3, context], events[close - 2], events[close - 1], ["exit", label, context]]);
  media = push(media, events.slice(close + 1));
  media = push(media, [["exit", group, context]]);
  splice(events, open, events.length, media);
  return events;
}
function tokenizeLabelEnd(effects, ok, nok) {
  const self = this;
  let index2 = self.events.length;
  let labelStart;
  let defined;
  while (index2--) {
    if ((self.events[index2][1].type === "labelImage" || self.events[index2][1].type === "labelLink") && !self.events[index2][1]._balanced) {
      labelStart = self.events[index2][1];
      break;
    }
  }
  return start;
  function start(code) {
    if (!labelStart) {
      return nok(code);
    }
    if (labelStart._inactive) {
      return labelEndNok(code);
    }
    defined = self.parser.defined.includes(normalizeIdentifier(self.sliceSerialize({
      start: labelStart.end,
      end: self.now()
    })));
    effects.enter("labelEnd");
    effects.enter("labelMarker");
    effects.consume(code);
    effects.exit("labelMarker");
    effects.exit("labelEnd");
    return after;
  }
  function after(code) {
    if (code === 40) {
      return effects.attempt(resourceConstruct, labelEndOk, defined ? labelEndOk : labelEndNok)(code);
    }
    if (code === 91) {
      return effects.attempt(referenceFullConstruct, labelEndOk, defined ? referenceNotFull : labelEndNok)(code);
    }
    return defined ? labelEndOk(code) : labelEndNok(code);
  }
  function referenceNotFull(code) {
    return effects.attempt(referenceCollapsedConstruct, labelEndOk, labelEndNok)(code);
  }
  function labelEndOk(code) {
    return ok(code);
  }
  function labelEndNok(code) {
    labelStart._balanced = true;
    return nok(code);
  }
}
function tokenizeResource(effects, ok, nok) {
  return resourceStart;
  function resourceStart(code) {
    effects.enter("resource");
    effects.enter("resourceMarker");
    effects.consume(code);
    effects.exit("resourceMarker");
    return resourceBefore;
  }
  function resourceBefore(code) {
    return markdownLineEndingOrSpace(code) ? factoryWhitespace(effects, resourceOpen)(code) : resourceOpen(code);
  }
  function resourceOpen(code) {
    if (code === 41) {
      return resourceEnd(code);
    }
    return factoryDestination(effects, resourceDestinationAfter, resourceDestinationMissing, "resourceDestination", "resourceDestinationLiteral", "resourceDestinationLiteralMarker", "resourceDestinationRaw", "resourceDestinationString", 32)(code);
  }
  function resourceDestinationAfter(code) {
    return markdownLineEndingOrSpace(code) ? factoryWhitespace(effects, resourceBetween)(code) : resourceEnd(code);
  }
  function resourceDestinationMissing(code) {
    return nok(code);
  }
  function resourceBetween(code) {
    if (code === 34 || code === 39 || code === 40) {
      return factoryTitle(effects, resourceTitleAfter, nok, "resourceTitle", "resourceTitleMarker", "resourceTitleString")(code);
    }
    return resourceEnd(code);
  }
  function resourceTitleAfter(code) {
    return markdownLineEndingOrSpace(code) ? factoryWhitespace(effects, resourceEnd)(code) : resourceEnd(code);
  }
  function resourceEnd(code) {
    if (code === 41) {
      effects.enter("resourceMarker");
      effects.consume(code);
      effects.exit("resourceMarker");
      effects.exit("resource");
      return ok;
    }
    return nok(code);
  }
}
function tokenizeReferenceFull(effects, ok, nok) {
  const self = this;
  return referenceFull;
  function referenceFull(code) {
    return factoryLabel.call(self, effects, referenceFullAfter, referenceFullMissing, "reference", "referenceMarker", "referenceString")(code);
  }
  function referenceFullAfter(code) {
    return self.parser.defined.includes(normalizeIdentifier(self.sliceSerialize(self.events[self.events.length - 1][1]).slice(1, -1))) ? ok(code) : nok(code);
  }
  function referenceFullMissing(code) {
    return nok(code);
  }
}
function tokenizeReferenceCollapsed(effects, ok, nok) {
  return referenceCollapsedStart;
  function referenceCollapsedStart(code) {
    effects.enter("reference");
    effects.enter("referenceMarker");
    effects.consume(code);
    effects.exit("referenceMarker");
    return referenceCollapsedOpen;
  }
  function referenceCollapsedOpen(code) {
    if (code === 93) {
      effects.enter("referenceMarker");
      effects.consume(code);
      effects.exit("referenceMarker");
      effects.exit("reference");
      return ok;
    }
    return nok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/label-start-image.js
var labelStartImage = {
  name: "labelStartImage",
  resolveAll: labelEnd.resolveAll,
  tokenize: tokenizeLabelStartImage
};
function tokenizeLabelStartImage(effects, ok, nok) {
  const self = this;
  return start;
  function start(code) {
    effects.enter("labelImage");
    effects.enter("labelImageMarker");
    effects.consume(code);
    effects.exit("labelImageMarker");
    return open;
  }
  function open(code) {
    if (code === 91) {
      effects.enter("labelMarker");
      effects.consume(code);
      effects.exit("labelMarker");
      effects.exit("labelImage");
      return after;
    }
    return nok(code);
  }
  function after(code) {
    return code === 94 && "_hiddenFootnoteSupport" in self.parser.constructs ? nok(code) : ok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/label-start-link.js
var labelStartLink = {
  name: "labelStartLink",
  resolveAll: labelEnd.resolveAll,
  tokenize: tokenizeLabelStartLink
};
function tokenizeLabelStartLink(effects, ok, nok) {
  const self = this;
  return start;
  function start(code) {
    effects.enter("labelLink");
    effects.enter("labelMarker");
    effects.consume(code);
    effects.exit("labelMarker");
    effects.exit("labelLink");
    return after;
  }
  function after(code) {
    return code === 94 && "_hiddenFootnoteSupport" in self.parser.constructs ? nok(code) : ok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/line-ending.js
var lineEnding = {
  name: "lineEnding",
  tokenize: tokenizeLineEnding
};
function tokenizeLineEnding(effects, ok) {
  return start;
  function start(code) {
    effects.enter("lineEnding");
    effects.consume(code);
    effects.exit("lineEnding");
    return factorySpace(effects, ok, "linePrefix");
  }
}

// node_modules/micromark-core-commonmark/lib/thematic-break.js
var thematicBreak = {
  name: "thematicBreak",
  tokenize: tokenizeThematicBreak
};
function tokenizeThematicBreak(effects, ok, nok) {
  let size = 0;
  let marker;
  return start;
  function start(code) {
    effects.enter("thematicBreak");
    return before(code);
  }
  function before(code) {
    marker = code;
    return atBreak(code);
  }
  function atBreak(code) {
    if (code === marker) {
      effects.enter("thematicBreakSequence");
      return sequence(code);
    }
    if (size >= 3 && (code === null || markdownLineEnding(code))) {
      effects.exit("thematicBreak");
      return ok(code);
    }
    return nok(code);
  }
  function sequence(code) {
    if (code === marker) {
      effects.consume(code);
      size++;
      return sequence;
    }
    effects.exit("thematicBreakSequence");
    return markdownSpace(code) ? factorySpace(effects, atBreak, "whitespace")(code) : atBreak(code);
  }
}

// node_modules/micromark-core-commonmark/lib/list.js
var list = {
  continuation: {
    tokenize: tokenizeListContinuation
  },
  exit: tokenizeListEnd,
  name: "list",
  tokenize: tokenizeListStart
};
var listItemPrefixWhitespaceConstruct = {
  partial: true,
  tokenize: tokenizeListItemPrefixWhitespace
};
var indentConstruct = {
  partial: true,
  tokenize: tokenizeIndent
};
function tokenizeListStart(effects, ok, nok) {
  const self = this;
  const tail = self.events[self.events.length - 1];
  let initialSize = tail && tail[1].type === "linePrefix" ? tail[2].sliceSerialize(tail[1], true).length : 0;
  let size = 0;
  return start;
  function start(code) {
    const kind = self.containerState.type || (code === 42 || code === 43 || code === 45 ? "listUnordered" : "listOrdered");
    if (kind === "listUnordered" ? !self.containerState.marker || code === self.containerState.marker : asciiDigit(code)) {
      if (!self.containerState.type) {
        self.containerState.type = kind;
        effects.enter(kind, {
          _container: true
        });
      }
      if (kind === "listUnordered") {
        effects.enter("listItemPrefix");
        return code === 42 || code === 45 ? effects.check(thematicBreak, nok, atMarker)(code) : atMarker(code);
      }
      if (!self.interrupt || code === 49) {
        effects.enter("listItemPrefix");
        effects.enter("listItemValue");
        return inside(code);
      }
    }
    return nok(code);
  }
  function inside(code) {
    if (asciiDigit(code) && ++size < 10) {
      effects.consume(code);
      return inside;
    }
    if ((!self.interrupt || size < 2) && (self.containerState.marker ? code === self.containerState.marker : code === 41 || code === 46)) {
      effects.exit("listItemValue");
      return atMarker(code);
    }
    return nok(code);
  }
  function atMarker(code) {
    effects.enter("listItemMarker");
    effects.consume(code);
    effects.exit("listItemMarker");
    self.containerState.marker = self.containerState.marker || code;
    return effects.check(
      blankLine,
      // Can’t be empty when interrupting.
      self.interrupt ? nok : onBlank,
      effects.attempt(listItemPrefixWhitespaceConstruct, endOfPrefix, otherPrefix)
    );
  }
  function onBlank(code) {
    self.containerState.initialBlankLine = true;
    initialSize++;
    return endOfPrefix(code);
  }
  function otherPrefix(code) {
    if (markdownSpace(code)) {
      effects.enter("listItemPrefixWhitespace");
      effects.consume(code);
      effects.exit("listItemPrefixWhitespace");
      return endOfPrefix;
    }
    return nok(code);
  }
  function endOfPrefix(code) {
    self.containerState.size = initialSize + self.sliceSerialize(effects.exit("listItemPrefix"), true).length;
    return ok(code);
  }
}
function tokenizeListContinuation(effects, ok, nok) {
  const self = this;
  self.containerState._closeFlow = void 0;
  return effects.check(blankLine, onBlank, notBlank);
  function onBlank(code) {
    self.containerState.furtherBlankLines = self.containerState.furtherBlankLines || self.containerState.initialBlankLine;
    return factorySpace(effects, ok, "listItemIndent", self.containerState.size + 1)(code);
  }
  function notBlank(code) {
    if (self.containerState.furtherBlankLines || !markdownSpace(code)) {
      self.containerState.furtherBlankLines = void 0;
      self.containerState.initialBlankLine = void 0;
      return notInCurrentItem(code);
    }
    self.containerState.furtherBlankLines = void 0;
    self.containerState.initialBlankLine = void 0;
    return effects.attempt(indentConstruct, ok, notInCurrentItem)(code);
  }
  function notInCurrentItem(code) {
    self.containerState._closeFlow = true;
    self.interrupt = void 0;
    return factorySpace(effects, effects.attempt(list, ok, nok), "linePrefix", self.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(code);
  }
}
function tokenizeIndent(effects, ok, nok) {
  const self = this;
  return factorySpace(effects, afterPrefix, "listItemIndent", self.containerState.size + 1);
  function afterPrefix(code) {
    const tail = self.events[self.events.length - 1];
    return tail && tail[1].type === "listItemIndent" && tail[2].sliceSerialize(tail[1], true).length === self.containerState.size ? ok(code) : nok(code);
  }
}
function tokenizeListEnd(effects) {
  effects.exit(this.containerState.type);
}
function tokenizeListItemPrefixWhitespace(effects, ok, nok) {
  const self = this;
  return factorySpace(effects, afterPrefix, "listItemPrefixWhitespace", self.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4 + 1);
  function afterPrefix(code) {
    const tail = self.events[self.events.length - 1];
    return !markdownSpace(code) && tail && tail[1].type === "listItemPrefixWhitespace" ? ok(code) : nok(code);
  }
}

// node_modules/micromark-core-commonmark/lib/setext-underline.js
var setextUnderline = {
  name: "setextUnderline",
  resolveTo: resolveToSetextUnderline,
  tokenize: tokenizeSetextUnderline
};
function resolveToSetextUnderline(events, context) {
  let index2 = events.length;
  let content3;
  let text3;
  let definition2;
  while (index2--) {
    if (events[index2][0] === "enter") {
      if (events[index2][1].type === "content") {
        content3 = index2;
        break;
      }
      if (events[index2][1].type === "paragraph") {
        text3 = index2;
      }
    } else {
      if (events[index2][1].type === "content") {
        events.splice(index2, 1);
      }
      if (!definition2 && events[index2][1].type === "definition") {
        definition2 = index2;
      }
    }
  }
  const heading = {
    type: "setextHeading",
    start: {
      ...events[content3][1].start
    },
    end: {
      ...events[events.length - 1][1].end
    }
  };
  events[text3][1].type = "setextHeadingText";
  if (definition2) {
    events.splice(text3, 0, ["enter", heading, context]);
    events.splice(definition2 + 1, 0, ["exit", events[content3][1], context]);
    events[content3][1].end = {
      ...events[definition2][1].end
    };
  } else {
    events[content3][1] = heading;
  }
  events.push(["exit", heading, context]);
  return events;
}
function tokenizeSetextUnderline(effects, ok, nok) {
  const self = this;
  let marker;
  return start;
  function start(code) {
    let index2 = self.events.length;
    let paragraph;
    while (index2--) {
      if (self.events[index2][1].type !== "lineEnding" && self.events[index2][1].type !== "linePrefix" && self.events[index2][1].type !== "content") {
        paragraph = self.events[index2][1].type === "paragraph";
        break;
      }
    }
    if (!self.parser.lazy[self.now().line] && (self.interrupt || paragraph)) {
      effects.enter("setextHeadingLine");
      marker = code;
      return before(code);
    }
    return nok(code);
  }
  function before(code) {
    effects.enter("setextHeadingLineSequence");
    return inside(code);
  }
  function inside(code) {
    if (code === marker) {
      effects.consume(code);
      return inside;
    }
    effects.exit("setextHeadingLineSequence");
    return markdownSpace(code) ? factorySpace(effects, after, "lineSuffix")(code) : after(code);
  }
  function after(code) {
    if (code === null || markdownLineEnding(code)) {
      effects.exit("setextHeadingLine");
      return ok(code);
    }
    return nok(code);
  }
}

// node_modules/micromark/lib/initialize/flow.js
var flow = {
  tokenize: initializeFlow
};
function initializeFlow(effects) {
  const self = this;
  const initial = effects.attempt(
    // Try to parse a blank line.
    blankLine,
    atBlankEnding,
    // Try to parse initial flow (essentially, only code).
    effects.attempt(this.parser.constructs.flowInitial, afterConstruct, factorySpace(effects, effects.attempt(this.parser.constructs.flow, afterConstruct, effects.attempt(content2, afterConstruct)), "linePrefix"))
  );
  return initial;
  function atBlankEnding(code) {
    if (code === null) {
      effects.consume(code);
      return;
    }
    effects.enter("lineEndingBlank");
    effects.consume(code);
    effects.exit("lineEndingBlank");
    self.currentConstruct = void 0;
    return initial;
  }
  function afterConstruct(code) {
    if (code === null) {
      effects.consume(code);
      return;
    }
    effects.enter("lineEnding");
    effects.consume(code);
    effects.exit("lineEnding");
    self.currentConstruct = void 0;
    return initial;
  }
}

// node_modules/micromark/lib/initialize/text.js
var resolver = {
  resolveAll: createResolver()
};
var string = initializeFactory("string");
var text = initializeFactory("text");
function initializeFactory(field) {
  return {
    resolveAll: createResolver(field === "text" ? resolveAllLineSuffixes : void 0),
    tokenize: initializeText
  };
  function initializeText(effects) {
    const self = this;
    const constructs2 = this.parser.constructs[field];
    const text3 = effects.attempt(constructs2, start, notText);
    return start;
    function start(code) {
      return atBreak(code) ? text3(code) : notText(code);
    }
    function notText(code) {
      if (code === null) {
        effects.consume(code);
        return;
      }
      effects.enter("data");
      effects.consume(code);
      return data;
    }
    function data(code) {
      if (atBreak(code)) {
        effects.exit("data");
        return text3(code);
      }
      effects.consume(code);
      return data;
    }
    function atBreak(code) {
      if (code === null) {
        return true;
      }
      const list2 = constructs2[code];
      let index2 = -1;
      if (list2) {
        while (++index2 < list2.length) {
          const item = list2[index2];
          if (!item.previous || item.previous.call(self, self.previous)) {
            return true;
          }
        }
      }
      return false;
    }
  }
}
function createResolver(extraResolver) {
  return resolveAllText;
  function resolveAllText(events, context) {
    let index2 = -1;
    let enter;
    while (++index2 <= events.length) {
      if (enter === void 0) {
        if (events[index2] && events[index2][1].type === "data") {
          enter = index2;
          index2++;
        }
      } else if (!events[index2] || events[index2][1].type !== "data") {
        if (index2 !== enter + 2) {
          events[enter][1].end = events[index2 - 1][1].end;
          events.splice(enter + 2, index2 - enter - 2);
          index2 = enter + 2;
        }
        enter = void 0;
      }
    }
    return extraResolver ? extraResolver(events, context) : events;
  }
}
function resolveAllLineSuffixes(events, context) {
  let eventIndex = 0;
  while (++eventIndex <= events.length) {
    if ((eventIndex === events.length || events[eventIndex][1].type === "lineEnding") && events[eventIndex - 1][1].type === "data") {
      const data = events[eventIndex - 1][1];
      const chunks = context.sliceStream(data);
      let index2 = chunks.length;
      let bufferIndex = -1;
      let size = 0;
      let tabs;
      while (index2--) {
        const chunk = chunks[index2];
        if (typeof chunk === "string") {
          bufferIndex = chunk.length;
          while (chunk.charCodeAt(bufferIndex - 1) === 32) {
            size++;
            bufferIndex--;
          }
          if (bufferIndex) break;
          bufferIndex = -1;
        } else if (chunk === -2) {
          tabs = true;
          size++;
        } else if (chunk === -1) {
        } else {
          index2++;
          break;
        }
      }
      if (context._contentTypeTextTrailing && eventIndex === events.length) {
        size = 0;
      }
      if (size) {
        const token = {
          type: eventIndex === events.length || tabs || size < 2 ? "lineSuffix" : "hardBreakTrailing",
          start: {
            _bufferIndex: index2 ? bufferIndex : data.start._bufferIndex + bufferIndex,
            _index: data.start._index + index2,
            line: data.end.line,
            column: data.end.column - size,
            offset: data.end.offset - size
          },
          end: {
            ...data.end
          }
        };
        data.end = {
          ...token.start
        };
        if (data.start.offset === data.end.offset) {
          Object.assign(data, token);
        } else {
          events.splice(eventIndex, 0, ["enter", token, context], ["exit", token, context]);
          eventIndex += 2;
        }
      }
      eventIndex++;
    }
  }
  return events;
}

// node_modules/micromark/lib/constructs.js
var constructs_exports = {};
__export(constructs_exports, {
  attentionMarkers: () => attentionMarkers,
  contentInitial: () => contentInitial,
  disable: () => disable,
  document: () => document3,
  flow: () => flow2,
  flowInitial: () => flowInitial,
  insideSpan: () => insideSpan,
  string: () => string2,
  text: () => text2
});
var document3 = {
  [42]: list,
  [43]: list,
  [45]: list,
  [48]: list,
  [49]: list,
  [50]: list,
  [51]: list,
  [52]: list,
  [53]: list,
  [54]: list,
  [55]: list,
  [56]: list,
  [57]: list,
  [62]: blockQuote
};
var contentInitial = {
  [91]: definition
};
var flowInitial = {
  [-2]: codeIndented,
  [-1]: codeIndented,
  [32]: codeIndented
};
var flow2 = {
  [35]: headingAtx,
  [42]: thematicBreak,
  [45]: [setextUnderline, thematicBreak],
  [60]: htmlFlow,
  [61]: setextUnderline,
  [95]: thematicBreak,
  [96]: codeFenced,
  [126]: codeFenced
};
var string2 = {
  [38]: characterReference,
  [92]: characterEscape
};
var text2 = {
  [-5]: lineEnding,
  [-4]: lineEnding,
  [-3]: lineEnding,
  [33]: labelStartImage,
  [38]: characterReference,
  [42]: attention,
  [60]: [autolink, htmlText],
  [91]: labelStartLink,
  [92]: [hardBreakEscape, characterEscape],
  [93]: labelEnd,
  [95]: attention,
  [96]: codeText
};
var insideSpan = {
  null: [attention, resolver]
};
var attentionMarkers = {
  null: [42, 95]
};
var disable = {
  null: []
};

// node_modules/micromark/lib/create-tokenizer.js
function createTokenizer(parser, initialize, from) {
  let point3 = {
    _bufferIndex: -1,
    _index: 0,
    line: from && from.line || 1,
    column: from && from.column || 1,
    offset: from && from.offset || 0
  };
  const columnStart = {};
  const resolveAllConstructs = [];
  let chunks = [];
  let stack = [];
  let consumed = true;
  const effects = {
    attempt: constructFactory(onsuccessfulconstruct),
    check: constructFactory(onsuccessfulcheck),
    consume,
    enter,
    exit: exit2,
    interrupt: constructFactory(onsuccessfulcheck, {
      interrupt: true
    })
  };
  const context = {
    code: null,
    containerState: {},
    defineSkip,
    events: [],
    now,
    parser,
    previous: null,
    sliceSerialize,
    sliceStream,
    write
  };
  let state = initialize.tokenize.call(context, effects);
  let expectedCode;
  if (initialize.resolveAll) {
    resolveAllConstructs.push(initialize);
  }
  return context;
  function write(slice) {
    chunks = push(chunks, slice);
    main();
    if (chunks[chunks.length - 1] !== null) {
      return [];
    }
    addResult(initialize, 0);
    context.events = resolveAll(resolveAllConstructs, context.events, context);
    return context.events;
  }
  function sliceSerialize(token, expandTabs) {
    return serializeChunks(sliceStream(token), expandTabs);
  }
  function sliceStream(token) {
    return sliceChunks(chunks, token);
  }
  function now() {
    const {
      _bufferIndex,
      _index,
      line,
      column,
      offset
    } = point3;
    return {
      _bufferIndex,
      _index,
      line,
      column,
      offset
    };
  }
  function defineSkip(value) {
    columnStart[value.line] = value.column;
    accountForPotentialSkip();
  }
  function main() {
    let chunkIndex;
    while (point3._index < chunks.length) {
      const chunk = chunks[point3._index];
      if (typeof chunk === "string") {
        chunkIndex = point3._index;
        if (point3._bufferIndex < 0) {
          point3._bufferIndex = 0;
        }
        while (point3._index === chunkIndex && point3._bufferIndex < chunk.length) {
          go(chunk.charCodeAt(point3._bufferIndex));
        }
      } else {
        go(chunk);
      }
    }
  }
  function go(code) {
    consumed = void 0;
    expectedCode = code;
    state = state(code);
  }
  function consume(code) {
    if (markdownLineEnding(code)) {
      point3.line++;
      point3.column = 1;
      point3.offset += code === -3 ? 2 : 1;
      accountForPotentialSkip();
    } else if (code !== -1) {
      point3.column++;
      point3.offset++;
    }
    if (point3._bufferIndex < 0) {
      point3._index++;
    } else {
      point3._bufferIndex++;
      if (point3._bufferIndex === // Points w/ non-negative `_bufferIndex` reference
      // strings.
      /** @type {string} */
      chunks[point3._index].length) {
        point3._bufferIndex = -1;
        point3._index++;
      }
    }
    context.previous = code;
    consumed = true;
  }
  function enter(type, fields) {
    const token = fields || {};
    token.type = type;
    token.start = now();
    context.events.push(["enter", token, context]);
    stack.push(token);
    return token;
  }
  function exit2(type) {
    const token = stack.pop();
    token.end = now();
    context.events.push(["exit", token, context]);
    return token;
  }
  function onsuccessfulconstruct(construct, info) {
    addResult(construct, info.from);
  }
  function onsuccessfulcheck(_, info) {
    info.restore();
  }
  function constructFactory(onreturn, fields) {
    return hook;
    function hook(constructs2, returnState, bogusState) {
      let listOfConstructs;
      let constructIndex;
      let currentConstruct;
      let info;
      return Array.isArray(constructs2) ? (
        /* c8 ignore next 1 */
        handleListOfConstructs(constructs2)
      ) : "tokenize" in constructs2 ? (
        // Looks like a construct.
        handleListOfConstructs([
          /** @type {Construct} */
          constructs2
        ])
      ) : handleMapOfConstructs(constructs2);
      function handleMapOfConstructs(map) {
        return start;
        function start(code) {
          const left = code !== null && map[code];
          const all2 = code !== null && map.null;
          const list2 = [
            // To do: add more extension tests.
            /* c8 ignore next 2 */
            ...Array.isArray(left) ? left : left ? [left] : [],
            ...Array.isArray(all2) ? all2 : all2 ? [all2] : []
          ];
          return handleListOfConstructs(list2)(code);
        }
      }
      function handleListOfConstructs(list2) {
        listOfConstructs = list2;
        constructIndex = 0;
        if (list2.length === 0) {
          return bogusState;
        }
        return handleConstruct(list2[constructIndex]);
      }
      function handleConstruct(construct) {
        return start;
        function start(code) {
          info = store();
          currentConstruct = construct;
          if (!construct.partial) {
            context.currentConstruct = construct;
          }
          if (construct.name && context.parser.constructs.disable.null.includes(construct.name)) {
            return nok(code);
          }
          return construct.tokenize.call(
            // If we do have fields, create an object w/ `context` as its
            // prototype.
            // This allows a “live binding”, which is needed for `interrupt`.
            fields ? Object.assign(Object.create(context), fields) : context,
            effects,
            ok,
            nok
          )(code);
        }
      }
      function ok(code) {
        consumed = true;
        onreturn(currentConstruct, info);
        return returnState;
      }
      function nok(code) {
        consumed = true;
        info.restore();
        if (++constructIndex < listOfConstructs.length) {
          return handleConstruct(listOfConstructs[constructIndex]);
        }
        return bogusState;
      }
    }
  }
  function addResult(construct, from2) {
    if (construct.resolveAll && !resolveAllConstructs.includes(construct)) {
      resolveAllConstructs.push(construct);
    }
    if (construct.resolve) {
      splice(context.events, from2, context.events.length - from2, construct.resolve(context.events.slice(from2), context));
    }
    if (construct.resolveTo) {
      context.events = construct.resolveTo(context.events, context);
    }
  }
  function store() {
    const startPoint = now();
    const startPrevious = context.previous;
    const startCurrentConstruct = context.currentConstruct;
    const startEventsIndex = context.events.length;
    const startStack = Array.from(stack);
    return {
      from: startEventsIndex,
      restore
    };
    function restore() {
      point3 = startPoint;
      context.previous = startPrevious;
      context.currentConstruct = startCurrentConstruct;
      context.events.length = startEventsIndex;
      stack = startStack;
      accountForPotentialSkip();
    }
  }
  function accountForPotentialSkip() {
    if (point3.line in columnStart && point3.column < 2) {
      point3.column = columnStart[point3.line];
      point3.offset += columnStart[point3.line] - 1;
    }
  }
}
function sliceChunks(chunks, token) {
  const startIndex = token.start._index;
  const startBufferIndex = token.start._bufferIndex;
  const endIndex = token.end._index;
  const endBufferIndex = token.end._bufferIndex;
  let view;
  if (startIndex === endIndex) {
    view = [chunks[startIndex].slice(startBufferIndex, endBufferIndex)];
  } else {
    view = chunks.slice(startIndex, endIndex);
    if (startBufferIndex > -1) {
      const head = view[0];
      if (typeof head === "string") {
        view[0] = head.slice(startBufferIndex);
      } else {
        view.shift();
      }
    }
    if (endBufferIndex > 0) {
      view.push(chunks[endIndex].slice(0, endBufferIndex));
    }
  }
  return view;
}
function serializeChunks(chunks, expandTabs) {
  let index2 = -1;
  const result = [];
  let atTab;
  while (++index2 < chunks.length) {
    const chunk = chunks[index2];
    let value;
    if (typeof chunk === "string") {
      value = chunk;
    } else switch (chunk) {
      case -5: {
        value = "\r";
        break;
      }
      case -4: {
        value = "\n";
        break;
      }
      case -3: {
        value = "\r\n";
        break;
      }
      case -2: {
        value = expandTabs ? " " : "	";
        break;
      }
      case -1: {
        if (!expandTabs && atTab) continue;
        value = " ";
        break;
      }
      default: {
        value = String.fromCharCode(chunk);
      }
    }
    atTab = chunk === -2;
    result.push(value);
  }
  return result.join("");
}

// node_modules/micromark/lib/parse.js
function parse(options) {
  const settings = options || {};
  const constructs2 = (
    /** @type {FullNormalizedExtension} */
    combineExtensions([constructs_exports, ...settings.extensions || []])
  );
  const parser = {
    constructs: constructs2,
    content: create(content),
    defined: [],
    document: create(document2),
    flow: create(flow),
    lazy: {},
    string: create(string),
    text: create(text)
  };
  return parser;
  function create(initial) {
    return creator;
    function creator(from) {
      return createTokenizer(parser, initial, from);
    }
  }
}

// node_modules/micromark/lib/postprocess.js
function postprocess(events) {
  while (!subtokenize(events)) {
  }
  return events;
}

// node_modules/micromark/lib/preprocess.js
var search = /[\0\t\n\r]/g;
function preprocess() {
  let column = 1;
  let buffer = "";
  let start = true;
  let atCarriageReturn;
  return preprocessor;
  function preprocessor(value, encoding, end) {
    const chunks = [];
    let match;
    let next;
    let startPosition;
    let endPosition;
    let code;
    value = buffer + (typeof value === "string" ? value.toString() : new TextDecoder(encoding || void 0).decode(value));
    startPosition = 0;
    buffer = "";
    if (start) {
      if (value.charCodeAt(0) === 65279) {
        startPosition++;
      }
      start = void 0;
    }
    while (startPosition < value.length) {
      search.lastIndex = startPosition;
      match = search.exec(value);
      endPosition = match && match.index !== void 0 ? match.index : value.length;
      code = value.charCodeAt(endPosition);
      if (!match) {
        buffer = value.slice(startPosition);
        break;
      }
      if (code === 10 && startPosition === endPosition && atCarriageReturn) {
        chunks.push(-3);
        atCarriageReturn = void 0;
      } else {
        if (atCarriageReturn) {
          chunks.push(-5);
          atCarriageReturn = void 0;
        }
        if (startPosition < endPosition) {
          chunks.push(value.slice(startPosition, endPosition));
          column += endPosition - startPosition;
        }
        switch (code) {
          case 0: {
            chunks.push(65533);
            column++;
            break;
          }
          case 9: {
            next = Math.ceil(column / 4) * 4;
            chunks.push(-2);
            while (column++ < next) chunks.push(-1);
            break;
          }
          case 10: {
            chunks.push(-4);
            column = 1;
            break;
          }
          default: {
            atCarriageReturn = true;
            column = 1;
          }
        }
      }
      startPosition = endPosition + 1;
    }
    if (end) {
      if (atCarriageReturn) chunks.push(-5);
      if (buffer) chunks.push(buffer);
      chunks.push(null);
    }
    return chunks;
  }
}

// node_modules/micromark-util-decode-string/index.js
var characterEscapeOrReference = /\\([!-/:-@[-`{-~])|&(#(?:\d{1,7}|x[\da-f]{1,6})|[\da-z]{1,31});/gi;
function decodeString(value) {
  return value.replace(characterEscapeOrReference, decode);
}
function decode($0, $1, $2) {
  if ($1) {
    return $1;
  }
  const head = $2.charCodeAt(0);
  if (head === 35) {
    const head2 = $2.charCodeAt(1);
    const hex = head2 === 120 || head2 === 88;
    return decodeNumericCharacterReference($2.slice(hex ? 2 : 1), hex ? 16 : 10);
  }
  return decodeNamedCharacterReference($2) || $0;
}

// node_modules/unist-util-stringify-position/lib/index.js
function stringifyPosition(value) {
  if (!value || typeof value !== "object") {
    return "";
  }
  if ("position" in value || "type" in value) {
    return position(value.position);
  }
  if ("start" in value || "end" in value) {
    return position(value);
  }
  if ("line" in value || "column" in value) {
    return point(value);
  }
  return "";
}
function point(point3) {
  return index(point3 && point3.line) + ":" + index(point3 && point3.column);
}
function position(pos) {
  return point(pos && pos.start) + "-" + point(pos && pos.end);
}
function index(value) {
  return value && typeof value === "number" ? value : 1;
}

// node_modules/mdast-util-from-markdown/lib/index.js
var own = {}.hasOwnProperty;
function fromMarkdown(value, encoding, options) {
  if (encoding && typeof encoding === "object") {
    options = encoding;
    encoding = void 0;
  }
  return compiler(options)(postprocess(parse(options).document().write(preprocess()(value, encoding, true))));
}
function compiler(options) {
  const config = {
    transforms: [],
    canContainEols: ["emphasis", "fragment", "heading", "paragraph", "strong"],
    enter: {
      autolink: opener(link),
      autolinkProtocol: onenterdata,
      autolinkEmail: onenterdata,
      atxHeading: opener(heading),
      blockQuote: opener(blockQuote2),
      characterEscape: onenterdata,
      characterReference: onenterdata,
      codeFenced: opener(codeFlow),
      codeFencedFenceInfo: buffer,
      codeFencedFenceMeta: buffer,
      codeIndented: opener(codeFlow, buffer),
      codeText: opener(codeText2, buffer),
      codeTextData: onenterdata,
      data: onenterdata,
      codeFlowValue: onenterdata,
      definition: opener(definition2),
      definitionDestinationString: buffer,
      definitionLabelString: buffer,
      definitionTitleString: buffer,
      emphasis: opener(emphasis),
      hardBreakEscape: opener(hardBreak),
      hardBreakTrailing: opener(hardBreak),
      htmlFlow: opener(html, buffer),
      htmlFlowData: onenterdata,
      htmlText: opener(html, buffer),
      htmlTextData: onenterdata,
      image: opener(image),
      label: buffer,
      link: opener(link),
      listItem: opener(listItem),
      listItemValue: onenterlistitemvalue,
      listOrdered: opener(list2, onenterlistordered),
      listUnordered: opener(list2),
      paragraph: opener(paragraph),
      reference: onenterreference,
      referenceString: buffer,
      resourceDestinationString: buffer,
      resourceTitleString: buffer,
      setextHeading: opener(heading),
      strong: opener(strong),
      thematicBreak: opener(thematicBreak2)
    },
    exit: {
      atxHeading: closer(),
      atxHeadingSequence: onexitatxheadingsequence,
      autolink: closer(),
      autolinkEmail: onexitautolinkemail,
      autolinkProtocol: onexitautolinkprotocol,
      blockQuote: closer(),
      characterEscapeValue: onexitdata,
      characterReferenceMarkerHexadecimal: onexitcharacterreferencemarker,
      characterReferenceMarkerNumeric: onexitcharacterreferencemarker,
      characterReferenceValue: onexitcharacterreferencevalue,
      characterReference: onexitcharacterreference,
      codeFenced: closer(onexitcodefenced),
      codeFencedFence: onexitcodefencedfence,
      codeFencedFenceInfo: onexitcodefencedfenceinfo,
      codeFencedFenceMeta: onexitcodefencedfencemeta,
      codeFlowValue: onexitdata,
      codeIndented: closer(onexitcodeindented),
      codeText: closer(onexitcodetext),
      codeTextData: onexitdata,
      data: onexitdata,
      definition: closer(),
      definitionDestinationString: onexitdefinitiondestinationstring,
      definitionLabelString: onexitdefinitionlabelstring,
      definitionTitleString: onexitdefinitiontitlestring,
      emphasis: closer(),
      hardBreakEscape: closer(onexithardbreak),
      hardBreakTrailing: closer(onexithardbreak),
      htmlFlow: closer(onexithtmlflow),
      htmlFlowData: onexitdata,
      htmlText: closer(onexithtmltext),
      htmlTextData: onexitdata,
      image: closer(onexitimage),
      label: onexitlabel,
      labelText: onexitlabeltext,
      lineEnding: onexitlineending,
      link: closer(onexitlink),
      listItem: closer(),
      listOrdered: closer(),
      listUnordered: closer(),
      paragraph: closer(),
      referenceString: onexitreferencestring,
      resourceDestinationString: onexitresourcedestinationstring,
      resourceTitleString: onexitresourcetitlestring,
      resource: onexitresource,
      setextHeading: closer(onexitsetextheading),
      setextHeadingLineSequence: onexitsetextheadinglinesequence,
      setextHeadingText: onexitsetextheadingtext,
      strong: closer(),
      thematicBreak: closer()
    }
  };
  configure(config, (options || {}).mdastExtensions || []);
  const data = {};
  return compile;
  function compile(events) {
    let tree = {
      type: "root",
      children: []
    };
    const context = {
      stack: [tree],
      tokenStack: [],
      config,
      enter,
      exit: exit2,
      buffer,
      resume,
      data
    };
    const listStack = [];
    let index2 = -1;
    while (++index2 < events.length) {
      if (events[index2][1].type === "listOrdered" || events[index2][1].type === "listUnordered") {
        if (events[index2][0] === "enter") {
          listStack.push(index2);
        } else {
          const tail = listStack.pop();
          index2 = prepareList(events, tail, index2);
        }
      }
    }
    index2 = -1;
    while (++index2 < events.length) {
      const handler = config[events[index2][0]];
      if (own.call(handler, events[index2][1].type)) {
        handler[events[index2][1].type].call(Object.assign({
          sliceSerialize: events[index2][2].sliceSerialize
        }, context), events[index2][1]);
      }
    }
    if (context.tokenStack.length > 0) {
      const tail = context.tokenStack[context.tokenStack.length - 1];
      const handler = tail[1] || defaultOnError;
      handler.call(context, void 0, tail[0]);
    }
    tree.position = {
      start: point2(events.length > 0 ? events[0][1].start : {
        line: 1,
        column: 1,
        offset: 0
      }),
      end: point2(events.length > 0 ? events[events.length - 2][1].end : {
        line: 1,
        column: 1,
        offset: 0
      })
    };
    index2 = -1;
    while (++index2 < config.transforms.length) {
      tree = config.transforms[index2](tree) || tree;
    }
    return tree;
  }
  function prepareList(events, start, length) {
    let index2 = start - 1;
    let containerBalance = -1;
    let listSpread = false;
    let listItem2;
    let lineIndex;
    let firstBlankLineIndex;
    let atMarker;
    while (++index2 <= length) {
      const event = events[index2];
      switch (event[1].type) {
        case "listUnordered":
        case "listOrdered":
        case "blockQuote": {
          if (event[0] === "enter") {
            containerBalance++;
          } else {
            containerBalance--;
          }
          atMarker = void 0;
          break;
        }
        case "lineEndingBlank": {
          if (event[0] === "enter") {
            if (listItem2 && !atMarker && !containerBalance && !firstBlankLineIndex) {
              firstBlankLineIndex = index2;
            }
            atMarker = void 0;
          }
          break;
        }
        case "linePrefix":
        case "listItemValue":
        case "listItemMarker":
        case "listItemPrefix":
        case "listItemPrefixWhitespace": {
          break;
        }
        default: {
          atMarker = void 0;
        }
      }
      if (!containerBalance && event[0] === "enter" && event[1].type === "listItemPrefix" || containerBalance === -1 && event[0] === "exit" && (event[1].type === "listUnordered" || event[1].type === "listOrdered")) {
        if (listItem2) {
          let tailIndex = index2;
          lineIndex = void 0;
          while (tailIndex--) {
            const tailEvent = events[tailIndex];
            if (tailEvent[1].type === "lineEnding" || tailEvent[1].type === "lineEndingBlank") {
              if (tailEvent[0] === "exit") continue;
              if (lineIndex) {
                events[lineIndex][1].type = "lineEndingBlank";
                listSpread = true;
              }
              tailEvent[1].type = "lineEnding";
              lineIndex = tailIndex;
            } else if (tailEvent[1].type === "linePrefix" || tailEvent[1].type === "blockQuotePrefix" || tailEvent[1].type === "blockQuotePrefixWhitespace" || tailEvent[1].type === "blockQuoteMarker" || tailEvent[1].type === "listItemIndent") {
            } else {
              break;
            }
          }
          if (firstBlankLineIndex && (!lineIndex || firstBlankLineIndex < lineIndex)) {
            listItem2._spread = true;
          }
          listItem2.end = Object.assign({}, lineIndex ? events[lineIndex][1].start : event[1].end);
          events.splice(lineIndex || index2, 0, ["exit", listItem2, event[2]]);
          index2++;
          length++;
        }
        if (event[1].type === "listItemPrefix") {
          const item = {
            type: "listItem",
            _spread: false,
            start: Object.assign({}, event[1].start),
            // @ts-expect-error: we’ll add `end` in a second.
            end: void 0
          };
          listItem2 = item;
          events.splice(index2, 0, ["enter", item, event[2]]);
          index2++;
          length++;
          firstBlankLineIndex = void 0;
          atMarker = true;
        }
      }
    }
    events[start][1]._spread = listSpread;
    return length;
  }
  function opener(create, and) {
    return open;
    function open(token) {
      enter.call(this, create(token), token);
      if (and) and.call(this, token);
    }
  }
  function buffer() {
    this.stack.push({
      type: "fragment",
      children: []
    });
  }
  function enter(node2, token, errorHandler) {
    const parent = this.stack[this.stack.length - 1];
    const siblings = parent.children;
    siblings.push(node2);
    this.stack.push(node2);
    this.tokenStack.push([token, errorHandler || void 0]);
    node2.position = {
      start: point2(token.start),
      // @ts-expect-error: `end` will be patched later.
      end: void 0
    };
  }
  function closer(and) {
    return close;
    function close(token) {
      if (and) and.call(this, token);
      exit2.call(this, token);
    }
  }
  function exit2(token, onExitError) {
    const node2 = this.stack.pop();
    const open = this.tokenStack.pop();
    if (!open) {
      throw new Error("Cannot close `" + token.type + "` (" + stringifyPosition({
        start: token.start,
        end: token.end
      }) + "): it\u2019s not open");
    } else if (open[0].type !== token.type) {
      if (onExitError) {
        onExitError.call(this, token, open[0]);
      } else {
        const handler = open[1] || defaultOnError;
        handler.call(this, token, open[0]);
      }
    }
    node2.position.end = point2(token.end);
  }
  function resume() {
    return toString(this.stack.pop());
  }
  function onenterlistordered() {
    this.data.expectingFirstListItemValue = true;
  }
  function onenterlistitemvalue(token) {
    if (this.data.expectingFirstListItemValue) {
      const ancestor = this.stack[this.stack.length - 2];
      ancestor.start = Number.parseInt(this.sliceSerialize(token), 10);
      this.data.expectingFirstListItemValue = void 0;
    }
  }
  function onexitcodefencedfenceinfo() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.lang = data2;
  }
  function onexitcodefencedfencemeta() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.meta = data2;
  }
  function onexitcodefencedfence() {
    if (this.data.flowCodeInside) return;
    this.buffer();
    this.data.flowCodeInside = true;
  }
  function onexitcodefenced() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.value = data2.replace(/^(\r?\n|\r)|(\r?\n|\r)$/g, "");
    this.data.flowCodeInside = void 0;
  }
  function onexitcodeindented() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.value = data2.replace(/(\r?\n|\r)$/g, "");
  }
  function onexitdefinitionlabelstring(token) {
    const label = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.label = label;
    node2.identifier = normalizeIdentifier(this.sliceSerialize(token)).toLowerCase();
  }
  function onexitdefinitiontitlestring() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.title = data2;
  }
  function onexitdefinitiondestinationstring() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.url = data2;
  }
  function onexitatxheadingsequence(token) {
    const node2 = this.stack[this.stack.length - 1];
    if (!node2.depth) {
      const depth = this.sliceSerialize(token).length;
      node2.depth = depth;
    }
  }
  function onexitsetextheadingtext() {
    this.data.setextHeadingSlurpLineEnding = true;
  }
  function onexitsetextheadinglinesequence(token) {
    const node2 = this.stack[this.stack.length - 1];
    node2.depth = this.sliceSerialize(token).codePointAt(0) === 61 ? 1 : 2;
  }
  function onexitsetextheading() {
    this.data.setextHeadingSlurpLineEnding = void 0;
  }
  function onenterdata(token) {
    const node2 = this.stack[this.stack.length - 1];
    const siblings = node2.children;
    let tail = siblings[siblings.length - 1];
    if (!tail || tail.type !== "text") {
      tail = text3();
      tail.position = {
        start: point2(token.start),
        // @ts-expect-error: we’ll add `end` later.
        end: void 0
      };
      siblings.push(tail);
    }
    this.stack.push(tail);
  }
  function onexitdata(token) {
    const tail = this.stack.pop();
    tail.value += this.sliceSerialize(token);
    tail.position.end = point2(token.end);
  }
  function onexitlineending(token) {
    const context = this.stack[this.stack.length - 1];
    if (this.data.atHardBreak) {
      const tail = context.children[context.children.length - 1];
      tail.position.end = point2(token.end);
      this.data.atHardBreak = void 0;
      return;
    }
    if (!this.data.setextHeadingSlurpLineEnding && config.canContainEols.includes(context.type)) {
      onenterdata.call(this, token);
      onexitdata.call(this, token);
    }
  }
  function onexithardbreak() {
    this.data.atHardBreak = true;
  }
  function onexithtmlflow() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.value = data2;
  }
  function onexithtmltext() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.value = data2;
  }
  function onexitcodetext() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.value = data2;
  }
  function onexitlink() {
    const node2 = this.stack[this.stack.length - 1];
    if (this.data.inReference) {
      const referenceType = this.data.referenceType || "shortcut";
      node2.type += "Reference";
      node2.referenceType = referenceType;
      delete node2.url;
      delete node2.title;
    } else {
      delete node2.identifier;
      delete node2.label;
    }
    this.data.referenceType = void 0;
  }
  function onexitimage() {
    const node2 = this.stack[this.stack.length - 1];
    if (this.data.inReference) {
      const referenceType = this.data.referenceType || "shortcut";
      node2.type += "Reference";
      node2.referenceType = referenceType;
      delete node2.url;
      delete node2.title;
    } else {
      delete node2.identifier;
      delete node2.label;
    }
    this.data.referenceType = void 0;
  }
  function onexitlabeltext(token) {
    const string3 = this.sliceSerialize(token);
    const ancestor = this.stack[this.stack.length - 2];
    ancestor.label = decodeString(string3);
    ancestor.identifier = normalizeIdentifier(string3).toLowerCase();
  }
  function onexitlabel() {
    const fragment = this.stack[this.stack.length - 1];
    const value = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    this.data.inReference = true;
    if (node2.type === "link") {
      const children = fragment.children;
      node2.children = children;
    } else {
      node2.alt = value;
    }
  }
  function onexitresourcedestinationstring() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.url = data2;
  }
  function onexitresourcetitlestring() {
    const data2 = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.title = data2;
  }
  function onexitresource() {
    this.data.inReference = void 0;
  }
  function onenterreference() {
    this.data.referenceType = "collapsed";
  }
  function onexitreferencestring(token) {
    const label = this.resume();
    const node2 = this.stack[this.stack.length - 1];
    node2.label = label;
    node2.identifier = normalizeIdentifier(this.sliceSerialize(token)).toLowerCase();
    this.data.referenceType = "full";
  }
  function onexitcharacterreferencemarker(token) {
    this.data.characterReferenceType = token.type;
  }
  function onexitcharacterreferencevalue(token) {
    const data2 = this.sliceSerialize(token);
    const type = this.data.characterReferenceType;
    let value;
    if (type) {
      value = decodeNumericCharacterReference(data2, type === "characterReferenceMarkerNumeric" ? 10 : 16);
      this.data.characterReferenceType = void 0;
    } else {
      const result = decodeNamedCharacterReference(data2);
      value = result;
    }
    const tail = this.stack[this.stack.length - 1];
    tail.value += value;
  }
  function onexitcharacterreference(token) {
    const tail = this.stack.pop();
    tail.position.end = point2(token.end);
  }
  function onexitautolinkprotocol(token) {
    onexitdata.call(this, token);
    const node2 = this.stack[this.stack.length - 1];
    node2.url = this.sliceSerialize(token);
  }
  function onexitautolinkemail(token) {
    onexitdata.call(this, token);
    const node2 = this.stack[this.stack.length - 1];
    node2.url = "mailto:" + this.sliceSerialize(token);
  }
  function blockQuote2() {
    return {
      type: "blockquote",
      children: []
    };
  }
  function codeFlow() {
    return {
      type: "code",
      lang: null,
      meta: null,
      value: ""
    };
  }
  function codeText2() {
    return {
      type: "inlineCode",
      value: ""
    };
  }
  function definition2() {
    return {
      type: "definition",
      identifier: "",
      label: null,
      title: null,
      url: ""
    };
  }
  function emphasis() {
    return {
      type: "emphasis",
      children: []
    };
  }
  function heading() {
    return {
      type: "heading",
      // @ts-expect-error `depth` will be set later.
      depth: 0,
      children: []
    };
  }
  function hardBreak() {
    return {
      type: "break"
    };
  }
  function html() {
    return {
      type: "html",
      value: ""
    };
  }
  function image() {
    return {
      type: "image",
      title: null,
      url: "",
      alt: null
    };
  }
  function link() {
    return {
      type: "link",
      title: null,
      url: "",
      children: []
    };
  }
  function list2(token) {
    return {
      type: "list",
      ordered: token.type === "listOrdered",
      start: null,
      spread: token._spread,
      children: []
    };
  }
  function listItem(token) {
    return {
      type: "listItem",
      spread: token._spread,
      checked: null,
      children: []
    };
  }
  function paragraph() {
    return {
      type: "paragraph",
      children: []
    };
  }
  function strong() {
    return {
      type: "strong",
      children: []
    };
  }
  function text3() {
    return {
      type: "text",
      value: ""
    };
  }
  function thematicBreak2() {
    return {
      type: "thematicBreak"
    };
  }
}
function point2(d) {
  return {
    line: d.line,
    column: d.column,
    offset: d.offset
  };
}
function configure(combined, extensions) {
  let index2 = -1;
  while (++index2 < extensions.length) {
    const value = extensions[index2];
    if (Array.isArray(value)) {
      configure(combined, value);
    } else {
      extension(combined, value);
    }
  }
}
function extension(combined, extension2) {
  let key;
  for (key in extension2) {
    if (own.call(extension2, key)) {
      switch (key) {
        case "canContainEols": {
          const right = extension2[key];
          if (right) {
            combined[key].push(...right);
          }
          break;
        }
        case "transforms": {
          const right = extension2[key];
          if (right) {
            combined[key].push(...right);
          }
          break;
        }
        case "enter":
        case "exit": {
          const right = extension2[key];
          if (right) {
            Object.assign(combined[key], right);
          }
          break;
        }
      }
    }
  }
}
function defaultOnError(left, right) {
  if (left) {
    throw new Error("Cannot close `" + left.type + "` (" + stringifyPosition({
      start: left.start,
      end: left.end
    }) + "): a different token (`" + right.type + "`, " + stringifyPosition({
      start: right.start,
      end: right.end
    }) + ") is open");
  } else {
    throw new Error("Cannot close document, a token (`" + right.type + "`, " + stringifyPosition({
      start: right.start,
      end: right.end
    }) + ") is still open");
  }
}

// src/utils/frontmatter-section.ts
function splitFrontmatter(content3) {
  const opening = /^\uFEFF?---\r?\n/.exec(content3);
  if (opening) {
    const rest = content3.slice(opening[0].length);
    const closing = /(?:^|\n)---(?:\r?\n|$)/.exec(rest);
    if (closing) {
      const bodyStart = opening[0].length + closing.index + closing[0].length;
      const yamlEnd = closing.index + (closing[0].startsWith("\n") ? 1 : 0);
      return { frontmatter: rest.slice(0, yamlEnd), body: content3.slice(bodyStart), bodyStart };
    }
  }
  return { body: content3, bodyStart: 0 };
}

// src/utils/markdown-source.ts
function parseBody(content3) {
  const end = splitFrontmatter(content3).bodyStart || (content3.startsWith("\uFEFF") ? 1 : 0);
  return fromMarkdown(content3.slice(0, end).replace(/[^\r\n]/g, " ") + content3.slice(end));
}
function rangeOf(node2) {
  var _a, _b;
  const start = (_a = node2.position) == null ? void 0 : _a.start.offset;
  const end = (_b = node2.position) == null ? void 0 : _b.end.offset;
  return start !== void 0 && end !== void 0 && end > start ? { start, end } : void 0;
}
function visit(node2, onLink, onText) {
  if (node2.type === "link" || node2.type === "image") {
    onLink(node2);
    if ("children" in node2) for (const child of node2.children) visit(child, onLink, () => {
    });
    return;
  }
  if (["code", "inlineCode", "html", "definition", "linkReference", "imageReference"].includes(node2.type)) return;
  if (node2.type === "text") {
    const range = rangeOf(node2);
    if (range) onText(range);
  }
  if ("children" in node2) for (const child of node2.children) visit(child, onLink, onText);
}
function escaped(content3, start) {
  let slashes = 0;
  while (start > 0 && content3[--start] === "\\") slashes++;
  return slashes % 2 === 1;
}
function parseMarkdownSource(content3) {
  const links = [];
  const ranges = [];
  const ids = [];
  visit(parseBody(content3), (node2) => {
    if (node2.type !== "link" && node2.type !== "image") return;
    const range = rangeOf(node2);
    if (!range) return;
    const original = content3.slice(range.start, range.end);
    if (!original.startsWith(node2.type === "image" ? "![" : "[") || !original.endsWith(")")) return;
    links.push({ ...range, kind: node2.type, original, destination: node2.url });
  }, (range) => {
    const text3 = content3.slice(range.start, range.end);
    for (const match of text3.matchAll(/!?\[\[[^[\]\r\n]+\]\]/g)) {
      const start = range.start + match.index;
      if (escaped(content3, start) || content3[start - 1] === "!") continue;
      ranges.push({ start, end: start + match[0].length });
    }
    for (const match of content3.slice(range.start, range.end).matchAll(/\^([A-Za-z0-9-]+)/g)) {
      const start = range.start + match.index;
      if (escaped(content3, start)) continue;
      let before = start;
      while (before > 0 && content3[before - 1] === "\\") before--;
      if (before > 0 && !/\s/.test(content3[before - 1])) continue;
      const end = start + match[0].length;
      const newline = content3.indexOf("\n", end);
      if (!/^[\t \r]*$/.test(content3.slice(end, newline === -1 ? content3.length : newline))) continue;
      ids.push(match[1]);
    }
  });
  return { links, wikiRanges: ranges, blockIds: ids };
}
function markdownLinks(content3) {
  return parseMarkdownSource(content3).links;
}
function wikiLinkRanges(content3) {
  return parseMarkdownSource(content3).wikiRanges;
}

// src/fix/fix-executor.ts
async function executeFixAction(app, action) {
  var _a;
  switch (action.kind) {
    case "trash-file":
      return trashFiles(app, action.targetPaths);
    case "remove-link-text": {
      const source = action.targetPaths[0];
      if (action.original !== void 0) {
        return replaceLinkText(app, source, action.original, (_a = action.replacement) != null ? _a : "");
      }
      return removeLinkText(app, source, action.linkText);
    }
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
  return replaceLinkText(app, sourcePath, void 0, "", linkText);
}
async function replaceLinkText(app, sourcePath, original, replacement, legacyLinkText) {
  const file = app.vault.getAbstractFileByPath(sourcePath);
  if (!(file instanceof import_obsidian8.TFile)) return 0;
  const content3 = await app.vault.read(file);
  const wiki = original === void 0 || /^!?\[\[/.test(original);
  const ranges = (wiki ? wikiLinkRanges(content3) : markdownLinks(content3)).filter(({ start, end }) => {
    const source = content3.slice(start, end);
    return original !== void 0 ? source === original : source === `[[${legacyLinkText}]]` || source === `![[${legacyLinkText}]]`;
  }).sort((left, right) => left.start - right.start);
  let cursor = 0;
  let updated = "";
  for (const { start, end } of ranges) {
    if (start < cursor) continue;
    updated += content3.slice(cursor, start) + replacement;
    cursor = end;
  }
  updated += content3.slice(cursor);
  if (updated === content3) return 0;
  await app.vault.modify(file, updated);
  return 1;
}

// src/fix/fix-runner.ts
async function runFixBatch(issues, decisions, dependencies) {
  const frozenSettings = structuredClone(dependencies.settings());
  const scanOnce = () => dependencies.scan(structuredClone(frozenSettings));
  const decisionsByFingerprint = new Map(
    decisions.map((decision) => [decision.fingerprint, decision])
  );
  const outcomes = issues.map(() => null);
  const pending = [];
  let scannedDuringBatch = false;
  for (const [index2, issue] of issues.entries()) {
    if (isBlockedFromExecution(issue)) {
      outcomes[index2] = skipped(
        issue,
        "The fix is blocked by the action policy."
      );
      continue;
    }
    const decision = decisionsByFingerprint.get(issue.fingerprint);
    if (!decision) {
      outcomes[index2] = skipped(
        issue,
        "No confirmed fix decision was available."
      );
      continue;
    }
    const freshResult = await scanOnce();
    scannedDuringBatch = true;
    const freshIssue = freshResult ? [...freshResult.issues, ...freshResult.ignoredIssues].find(
      (candidate) => candidate.fingerprint === issue.fingerprint
    ) : void 0;
    if (freshIssue && isBlockedFromExecution(freshIssue)) {
      outcomes[index2] = skipped(
        issue,
        "The finding was re-evaluated as blocked before execution."
      );
      continue;
    }
    const freshAction = getFreshFixAction(issue, freshIssue, decision);
    if (!freshAction) {
      outcomes[index2] = skipped(
        issue,
        freshResult ? "The finding or fix evidence changed before execution." : "The preflight scan did not complete."
      );
      continue;
    }
    try {
      pending.push({
        index: index2,
        fingerprint: issue.fingerprint,
        affectedPaths: [...freshAction.targetPaths],
        affectedCount: await dependencies.execute(freshAction)
      });
    } catch (error) {
      outcomes[index2] = {
        fingerprint: issue.fingerprint,
        outcome: "failed",
        phase: "execution",
        message: error instanceof Error ? error.message : String(error),
        affectedPaths: [...freshAction.targetPaths]
      };
    }
  }
  const verificationResult = pending.length > 0 || scannedDuringBatch ? await scanOnce() : null;
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
var COMPARISON_VERSION = 3;
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

// src/snapshot/scan-history.ts
var HISTORY_SCHEMA_VERSION = 1;
var MAX_HISTORY_ENTRIES = 20;
function createScanHistoryEntry(input) {
  var _a;
  const { result, comparison } = input;
  return {
    schemaVersion: HISTORY_SCHEMA_VERSION,
    createdAt: (_a = input.createdAt) != null ? _a : Date.now(),
    toolVersion: input.toolVersion,
    scanProfile: input.scanProfile,
    comparisonVersion: COMPARISON_VERSION,
    trigger: input.trigger,
    filesScanned: result.filesScanned,
    scannersRun: [...result.scannersRun],
    totals: {
      active: result.issues.length,
      ignored: result.ignoredIssues.length,
      newIssues: countStatus2(comparison, "new"),
      persistingIssues: countStatus2(comparison, "persisting"),
      resolvedIssues: comparison.available ? comparison.resolvedIssues.length : 0
    },
    severityCounts: countSeverities(result.issues),
    classificationCounts: countClassifications(result.issues)
  };
}
function appendScanHistoryEntry(history, entry) {
  return [entry, ...history].slice(0, MAX_HISTORY_ENTRIES);
}
function isScanHistoryEntry(value) {
  if (!isPlainRecord2(value)) return false;
  if (!hasOnlyKeys2(value, [
    "schemaVersion",
    "createdAt",
    "toolVersion",
    "scanProfile",
    "comparisonVersion",
    "trigger",
    "filesScanned",
    "scannersRun",
    "totals",
    "severityCounts",
    "classificationCounts"
  ])) {
    return false;
  }
  if (value.schemaVersion !== HISTORY_SCHEMA_VERSION) return false;
  if (typeof value.createdAt !== "number" || !Number.isFinite(value.createdAt)) return false;
  if (typeof value.toolVersion !== "string") return false;
  if (typeof value.scanProfile !== "string") return false;
  if (typeof value.comparisonVersion !== "number" || !Number.isSafeInteger(value.comparisonVersion) || value.comparisonVersion <= 0) {
    return false;
  }
  if (!isOneOf2(value.trigger, ["manual", "automatic"])) return false;
  if (!isCount(value.filesScanned)) return false;
  if (!Array.isArray(value.scannersRun) || value.scannersRun.length === 0) return false;
  const seen = /* @__PURE__ */ new Set();
  for (const scannerId of value.scannersRun) {
    if (typeof scannerId !== "string") return false;
    if (!SCANNER_IDS.includes(scannerId)) return false;
    if (seen.has(scannerId)) return false;
    seen.add(scannerId);
  }
  if (!isCountRecord(value.totals, [
    "active",
    "ignored",
    "newIssues",
    "persistingIssues",
    "resolvedIssues"
  ])) {
    return false;
  }
  if (!isCountRecord(value.severityCounts, ["error", "warning", "info"])) return false;
  if (!isCountRecord(value.classificationCounts, ["confirmed", "candidate", "unverified"])) {
    return false;
  }
  return true;
}
function parseScanHistory(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(isScanHistoryEntry).sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_HISTORY_ENTRIES);
}
function countStatus2(comparison, status) {
  if (!comparison.available) return 0;
  let total = 0;
  for (const value of comparison.statuses.values()) {
    if (value === status) total += 1;
  }
  return total;
}
function countSeverities(issues) {
  const counts = {
    error: 0,
    warning: 0,
    info: 0
  };
  for (const issue of issues) counts[issue.severity] += 1;
  return counts;
}
function countClassifications(issues) {
  const counts = {
    confirmed: 0,
    candidate: 0,
    unverified: 0
  };
  for (const issue of issues) counts[issue.classification] += 1;
  return counts;
}
function isCount(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function isCountRecord(value, keys) {
  if (!isPlainRecord2(value)) return false;
  if (!hasOnlyKeys2(value, keys)) return false;
  return keys.every((key) => isCount(value[key]));
}
function isPlainRecord2(value) {
  if (!isRecord2(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function hasOnlyKeys2(value, allowed) {
  return Reflect.ownKeys(value).every(
    (key) => typeof key === "string" && allowed.includes(key)
  );
}
function isOneOf2(value, allowed) {
  return typeof value === "string" && allowed.includes(value);
}

// src/settings/plugin-data.ts
function parsePluginData(value) {
  if (!isRecord3(value)) {
    return {
      settings: {},
      lastSuccessfulSnapshot: null,
      scanHistory: [],
      legacy: true
    };
  }
  if (isRecord3(value.settings)) {
    return {
      settings: value.settings,
      lastSuccessfulSnapshot: isScanSnapshot(value.lastSuccessfulSnapshot) ? value.lastSuccessfulSnapshot : null,
      scanHistory: parseScanHistory(value.scanHistory),
      legacy: false
    };
  }
  return {
    settings: value,
    lastSuccessfulSnapshot: null,
    scanHistory: [],
    legacy: true
  };
}
function isRecord3(value) {
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
function resolveBaselineCompatibility(baselineComparisonVersion, baselineScanProfile, currentProfile) {
  if (baselineComparisonVersion !== COMPARISON_VERSION) return "semantics-changed";
  if (baselineScanProfile !== currentProfile) return "settings-changed";
  return null;
}
function compareScanResult(current, snapshot, currentProfile) {
  if (snapshot === null) return unavailable("first-scan");
  const mismatch = resolveBaselineCompatibility(
    snapshot.comparisonVersion,
    snapshot.scanProfile,
    currentProfile
  );
  if (mismatch) {
    return { ...unavailable(mismatch), previousScanAt: snapshot.createdAt };
  }
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
  return {
    available: true,
    previousScanAt: snapshot.createdAt,
    statuses,
    resolvedIssues
  };
}
function unavailable(reason) {
  return {
    available: false,
    reason,
    statuses: /* @__PURE__ */ new Map(),
    resolvedIssues: []
  };
}

// src/scanner/scan-session.ts
async function runScanSession(deps, settings, hooks = {}, trigger = "manual") {
  let scanSettings;
  let scanProfile;
  try {
    scanSettings = structuredClone(settings);
    scanProfile = await deps.createProfile(scanSettings);
  } catch (error) {
    return { status: "failed", message: errorMessage2(error) };
  }
  const operation = await runScanOperation(deps, scanSettings, hooks);
  if (operation.status === "failed") return operation;
  try {
    const accepted = await acceptScanResult(
      deps,
      hooks,
      operation.result,
      scanProfile,
      trigger
    );
    return { status: "completed", result: operation.result, ...accepted };
  } catch (error) {
    stopScanningBestEffort(hooks);
    return { status: "failed", message: errorMessage2(error) };
  }
}
async function runScanOperation(deps, settings, hooks = {}) {
  var _a;
  try {
    (_a = hooks.onScanningChange) == null ? void 0 : _a.call(hooks, true);
    const result = await deps.runner.run(deps.app, settings, {
      onProgress: (progress) => {
        var _a2;
        try {
          (_a2 = hooks.onProgress) == null ? void 0 : _a2.call(hooks, progress);
        } catch (e) {
        }
      }
    });
    return { status: "completed", result };
  } catch (error) {
    stopScanningBestEffort(hooks);
    return { status: "failed", message: errorMessage2(error) };
  }
}
async function acceptScanResult(deps, hooks, result, scanProfile, trigger = "manual") {
  var _a;
  const comparison = compareScanResult(result, deps.getSnapshot(), scanProfile);
  (_a = hooks.onResult) == null ? void 0 : _a.call(hooks, result, comparison);
  const nextSnapshot = createScanSnapshot(result, scanProfile, deps.toolVersion);
  const nextHistory = appendScanHistoryEntry(
    deps.getHistory(),
    createScanHistoryEntry({
      result,
      comparison,
      scanProfile,
      toolVersion: deps.toolVersion,
      trigger
    })
  );
  try {
    await deps.persistAccepted({
      acceptedSnapshot: nextSnapshot,
      acceptedHistory: nextHistory
    });
  } catch (error) {
    return { comparison, persistWarning: errorMessage2(error) };
  }
  return { comparison };
}
function stopScanningBestEffort(hooks) {
  var _a;
  try {
    (_a = hooks.onScanningChange) == null ? void 0 : _a.call(hooks, false);
  } catch (e) {
  }
}
function errorMessage2(error) {
  return error instanceof Error ? error.message : String(error);
}

// src/scanner/scan-scheduler.ts
var HOUR_MS = 36e5;
function decideAutomaticScan(input) {
  const intervalMs = input.settings.automaticScanIntervalHours * HOUR_MS;
  if (intervalMs <= 0) return { run: false, reason: "disabled" };
  if (input.busy) return { run: false, reason: "busy" };
  if (input.snapshot !== null && input.now - input.snapshot.createdAt < intervalMs) {
    return { run: false, reason: "fresh" };
  }
  return { run: true };
}
function automaticScanSettings(settings) {
  const scanSettings = structuredClone(settings);
  if (!scanSettings.automaticScanNetworkChecks) {
    scanSettings.enabledScanners["external-links"] = false;
  }
  return scanSettings;
}
function confirmedNewIssues(result, comparison) {
  if (!comparison.available) return [];
  return result.issues.filter((issue) => comparison.statuses.get(issue.fingerprint) === "new" && issue.classification === "confirmed" && issue.severity === "error");
}
function automaticScanNotice(newIssues) {
  const count = newIssues.length;
  return `Vault Inspector automatic scan found ${count} new confirmed error${count === 1 ? "" : "s"}.`;
}
function createStartupScanScheduler(deps) {
  let scheduled = false;
  let fired = false;
  return {
    schedule() {
      if (scheduled) return;
      scheduled = true;
      deps.whenSettled(() => {
        if (fired) return;
        fired = true;
        const decision = decideAutomaticScan({
          settings: deps.getSettings(),
          snapshot: deps.getSnapshot(),
          now: deps.now(),
          busy: deps.isBusy()
        });
        if (!decision.run) return;
        void deps.runAutomaticScan(automaticScanSettings(deps.getSettings())).then((outcome) => {
          if (outcome.status !== "completed" || outcome.persistWarning !== void 0) return;
          const newIssues = confirmedNewIssues(
            outcome.result,
            outcome.comparison
          );
          if (newIssues.length > 0) {
            deps.notify(automaticScanNotice(newIssues));
          }
        }).catch(() => {
        });
      });
    }
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
    this.scanHistory = [];
    this.saveQueue = Promise.resolve();
    this.operationQueue = Promise.resolve();
    this.operationRunning = false;
    this.startupScanScheduler = null;
    this.scanRunner = new ScanRunner(async (url, method) => {
      const response = await (0, import_obsidian9.requestUrl)({
        url,
        method,
        headers: method === "GET" ? { Range: "bytes=0-0" } : void 0
      });
      return { status: response.status, method };
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
    this.startupScanScheduler = createStartupScanScheduler({
      getSettings: () => this.settings,
      getSnapshot: () => this.lastSuccessfulSnapshot,
      isBusy: () => this.operationRunning,
      now: () => Date.now(),
      whenSettled: (run) => this.app.workspace.onLayoutReady(run),
      runAutomaticScan: (settings) => this.enqueueOperation(() => runScanSession(this.scanDeps(), settings, {}, "automatic")),
      notify: (message) => new import_obsidian9.Notice(message)
    });
    this.startupScanScheduler.schedule();
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
    this.scanHistory = parsed.scanHistory;
    if (migrateExcalidrawFrontmatterKey(this.settings, loaded)) {
      await this.saveSettings();
    }
  }
  async saveSettings() {
    await this.persistPluginData();
  }
  persistPluginData(options) {
    const write = this.saveQueue.catch(() => void 0).then(async () => {
      var _a, _b, _c;
      const snapshot = (_a = options == null ? void 0 : options.acceptedSnapshot) != null ? _a : this.lastSuccessfulSnapshot;
      const history = (_b = options == null ? void 0 : options.acceptedHistory) != null ? _b : this.scanHistory;
      const data = {
        settings: structuredClone((_c = options == null ? void 0 : options.settings) != null ? _c : this.settings),
        ...snapshot ? { lastSuccessfulSnapshot: structuredClone(snapshot) } : {},
        ...history.length > 0 ? { scanHistory: structuredClone(history) } : {}
      };
      await this.saveData(data);
      if (options == null ? void 0 : options.acceptedSnapshot) {
        this.lastSuccessfulSnapshot = options.acceptedSnapshot;
      }
      if (options == null ? void 0 : options.acceptedHistory) {
        this.scanHistory = options.acceptedHistory;
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
            message: `Failed to ignore issue: ${errorMessage3(error)}`,
            affectedPaths: getAffectedIssuePaths(issue)
          })));
          return;
        }
        this.settings.ignoredIssueFingerprints = mergeUnique(
          this.settings.ignoredIssueFingerprints,
          fingerprints
        );
        await this.performScanAndRender(view);
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
            message: `Failed to restore issue: ${errorMessage3(error)}`,
            affectedPaths: getAffectedIssuePaths(issue)
          })));
          return;
        }
        this.settings.ignoredIssueFingerprints = this.settings.ignoredIssueFingerprints.filter(
          (fp) => !toRestore.has(fp)
        );
        await this.performScanAndRender(view);
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
            settings: () => fixSettings,
            scan: (batchSettings) => this.scan(view, batchSettings),
            execute: (action) => executeFixAction(this.app, action)
          });
          let acceptanceFailed = false;
          let acceptanceError;
          if (batch.verificationResult) {
            try {
              const accepted = await acceptScanResult(
                this.scanDeps(),
                this.viewHooks(view),
                batch.verificationResult,
                scanProfile
              );
              if (accepted.persistWarning) {
                new import_obsidian9.Notice(
                  `Scan completed, but the comparison snapshot could not be saved: ${accepted.persistWarning}`
                );
              }
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
            message: `Failed to ignore issue: ${errorMessage3(error)}`,
            affectedPaths
          }]);
          return;
        }
        this.settings.ignoredIssueFingerprints = mergeUnique(
          this.settings.ignoredIssueFingerprints,
          [issue.fingerprint]
        );
        await this.performScanAndRender(view);
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
            message: `Failed to exclude folder: ${errorMessage3(error)}`,
            affectedPaths: [request.folder]
          }]);
          return;
        }
        this.settings.ignoredFoldersByScanner[request.scannerId] = mergeUnique(
          this.settings.ignoredFoldersByScanner[request.scannerId],
          [request.folder]
        );
        await this.performScanAndRender(view);
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
      await this.performScanAndRender(view);
    });
  }
  enqueueOperation(operation) {
    const run = this.operationQueue.catch(() => void 0).then(() => this.runOperation(operation));
    this.operationQueue = run.catch(() => void 0);
    return run;
  }
  async runOperation(operation) {
    this.operationRunning = true;
    try {
      return await operation();
    } finally {
      this.operationRunning = false;
    }
  }
  async performScanAndRender(view) {
    const outcome = await runScanSession(
      this.scanDeps(),
      this.settings,
      this.viewHooks(view)
    );
    if (outcome.status === "failed") {
      new import_obsidian9.Notice(`Vault Inspector scan failed: ${outcome.message}`);
      return;
    }
    if (outcome.persistWarning) {
      new import_obsidian9.Notice(
        `Scan completed, but the comparison snapshot could not be saved: ${outcome.persistWarning}`
      );
    }
  }
  scanDeps() {
    return {
      app: this.app,
      runner: this.scanRunner,
      createProfile: createScanProfile,
      toolVersion: this.manifest.version,
      getSnapshot: () => this.lastSuccessfulSnapshot,
      getHistory: () => this.scanHistory,
      persistAccepted: (accepted) => this.persistPluginData(accepted)
    };
  }
  viewHooks(view) {
    return {
      onScanningChange: (scanning) => view.setScanning(scanning),
      onProgress: (progress) => view.setScanProgress(progress),
      onResult: (result, comparison) => view.setResult(result, comparison)
    };
  }
  async scan(view, settings) {
    const outcome = await runScanOperation(
      this.scanDeps(),
      settings,
      this.viewHooks(view)
    );
    if (outcome.status === "failed") {
      new import_obsidian9.Notice(`Vault Inspector scan failed: ${outcome.message}`);
      return null;
    }
    return outcome.result;
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
      new import_obsidian9.Notice(`Report export failed: ${errorMessage3(error)}`);
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
function errorMessage3(error) {
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