#!/usr/bin/env node

/**
 * Disk-Fish Self-Contained Production Audit
 *
 * Evidence-first verification.
 *
 * STATUS VALUES:
 *   PASS
 *   FAILED
 *   BLOCKED
 *   UNAVAILABLE
 *   NOT_CONFIGURED
 *
 * The audit never converts an unexecuted check into PASS.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const REPORT_DIR = path.join(ROOT, "audit-reports");
const JSON_REPORT = path.join(REPORT_DIR, "production-audit.json");
const TEXT_REPORT = path.join(REPORT_DIR, "production-audit.txt");

const startedAt = new Date();
const results = [];

function exists(file) {
    return fs.existsSync(path.join(ROOT, file));
}

function readJson(file) {
    try {
        return JSON.parse(
            fs.readFileSync(path.join(ROOT, file), "utf8")
        );
    } catch {
        return null;
    }
}

function record(name, status, details = {}) {
    results.push({
        name,
        status,
        ...details
    });
}

function commandExists(command) {
    const checker =
        process.platform === "win32" ? "where" : "which";

    const result = spawnSync(
        checker,
        [command],
        {
            cwd: ROOT,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"]
        }
    );

    return result.status === 0;
}

function run(command, args, options = {}) {
    const started = Date.now();

    console.log(`\n> ${command} ${args.join(" ")}`);

    const result = spawnSync(
        command,
        args,
        {
            cwd: ROOT,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
            timeout: options.timeout ?? 10 * 60 * 1000,
            maxBuffer: 20 * 1024 * 1024,
            shell: false
        }
    );

    const durationMs = Date.now() - started;

    const stdout = result.stdout ?? "";
    const stderr = result.stderr ?? "";

    if (stdout.trim()) {
        process.stdout.write(stdout);
    }

    if (stderr.trim()) {
        process.stderr.write(stderr);
    }

    return {
        code: result.status,
        signal: result.signal ?? null,
        stdout,
        stderr,
        durationMs,
        timedOut: result.error?.code === "ETIMEDOUT",
        error: result.error?.message ?? null
    };
}

function detectPackageManager() {
    if (exists("pnpm-lock.yaml")) return "pnpm";
    if (exists("yarn.lock")) return "yarn";
    if (exists("bun.lockb") || exists("bun.lock")) return "bun";
    if (exists("package-lock.json")) return "npm";

    return null;
}

function packageRun(pm, script) {
    switch (pm) {
        case "npm":
            return ["npm", ["run", script]];

        case "pnpm":
            return ["pnpm", ["run", script]];

        case "yarn":
            return ["yarn", [script]];

        case "bun":
            return ["bun", ["run", script]];

        default:
            return null;
    }
}

function verifyGit() {
    if (!commandExists("git")) {
        record("git", "UNAVAILABLE", {
            reason: "git executable unavailable"
        });
        return;
    }

    const branch = run("git", ["branch", "--show-current"]);
    const sha = run("git", ["rev-parse", "HEAD"]);
    const status = run("git", ["status", "--short"]);
    const remote = run("git", ["remote", "get-url", "origin"]);

    if (
        branch.code !== 0 ||
        sha.code !== 0 ||
        remote.code !== 0
    ) {
        record("git", "FAILED", {
            reason: "Unable to fully inspect repository state"
        });
        return;
    }

    record("git", "PASS", {
        branch: branch.stdout.trim(),
        commit: sha.stdout.trim(),
        remote: remote.stdout.trim(),
        workingTreeDirty: Boolean(status.stdout.trim())
    });
}

function verifyNode() {
    if (!commandExists("node")) {
        record("node", "BLOCKED", {
            reason: "Node.js is unavailable"
        });
        return;
    }

    const result = run("node", ["--version"]);

    record(
        "node",
        result.code === 0 ? "PASS" : "FAILED",
        {
            version: result.stdout.trim(),
            reason:
                result.code === 0
                    ? undefined
                    : result.stderr.trim()
        }
    );
}

function verifyPackageManager(pm) {
    if (!pm) {
        record("package-manager", "BLOCKED", {
            reason:
                "No supported lockfile detected. Refusing to guess."
        });
        return;
    }

    if (!commandExists(pm)) {
        record("package-manager", "BLOCKED", {
            manager: pm,
            reason: `${pm} executable unavailable`
        });
        return;
    }

    const result = run(pm, ["--version"]);

    record(
        "package-manager",
        result.code === 0 ? "PASS" : "FAILED",
        {
            manager: pm,
            version: result.stdout.trim()
        }
    );
}

function installDependencies(pm) {
    let args;

    switch (pm) {
        case "npm":
            args = ["ci"];
            break;

        case "pnpm":
            args = ["install", "--frozen-lockfile"];
            break;

        case "yarn":
            args = ["install", "--immutable"];
            break;

        case "bun":
            args = ["install", "--frozen-lockfile"];
            break;

        default:
            record("dependency-install", "BLOCKED", {
                reason: "Unsupported package manager"
            });
            return;
    }

    const result = run(pm, args, {
        timeout: 15 * 60 * 1000
    });

    record(
        "dependency-install",
        result.code === 0 ? "PASS" : "BLOCKED",
        {
            manager: pm,
            durationMs: result.durationMs,
            reason:
                result.code === 0
                    ? undefined
                    : result.timedOut
                        ? "Dependency installation timed out"
                        : result.stderr.trim().slice(-4000) ||
                          result.error ||
                          "Dependency installation failed"
        }
    );
}

function runScript(pm, scripts, script, required = false) {
    if (!scripts.includes(script)) {
        record(
            script,
            required ? "BLOCKED" : "NOT_CONFIGURED",
            {
                reason:
                    required
                        ? `Required script "${script}" is missing`
                        : `Script "${script}" is not configured`
            }
        );

        return;
    }

    const command = packageRun(pm, script);

    if (!command) {
        record(script, "BLOCKED", {
            reason: "Package manager unavailable"
        });
        return;
    }

    const result = run(command[0], command[1]);

    record(
        script,
        result.code === 0 ? "PASS" : "FAILED",
        {
            durationMs: result.durationMs,
            exitCode: result.code,
            reason:
                result.code === 0
                    ? undefined
                    : result.timedOut
                        ? "Command timed out"
                        : result.stderr.trim().slice(-4000) ||
                          result.stdout.trim().slice(-4000) ||
                          "Command failed"
        }
    );
}

function scanSecrets() {
    const roots = ["src", "server", "scripts"];

    const extensions = new Set([
        ".ts",
        ".tsx",
        ".js",
        ".jsx",
        ".mjs",
        ".cjs"
    ]);

    const suspicious = [];

    function walk(directory) {
        if (!fs.existsSync(directory)) return;

        for (const entry of fs.readdirSync(
            directory,
            { withFileTypes: true }
        )) {
            if (
                entry.name === "node_modules" ||
                entry.name === ".git" ||
                entry.name === "dist" ||
                entry.name === "build"
            ) {
                continue;
            }

            const full = path.join(directory, entry.name);

            if (entry.isDirectory()) {
                walk(full);
                continue;
            }

            if (!extensions.has(path.extname(entry.name))) {
                continue;
            }

            let content;

            try {
                content = fs.readFileSync(full, "utf8");
            } catch {
                continue;
            }

            const patterns = [
                /sk-[A-Za-z0-9_-]{20,}/g,
                /AIza[0-9A-Za-z_-]{20,}/g,
                /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
                /Bearer\s+[A-Za-z0-9._-]{20,}/gi
            ];

            if (patterns.some(pattern => pattern.test(content))) {
                suspicious.push(path.relative(ROOT, full));
            }
        }
    }

    for (const root of roots) {
        walk(path.join(ROOT, root));
    }

    if (suspicious.length === 0) {
        record("secret-pattern-scan", "PASS");
    } else {
        record("secret-pattern-scan", "FAILED", {
            files: [...new Set(suspicious)],
            reason:
                "Potential credential pattern detected. Values are intentionally not printed."
        });
    }
}

function diskFishRiskScan() {
    const roots = ["src", "server"];

    const findings = [];

    function walk(directory) {
        if (!fs.existsSync(directory)) return;

        for (const entry of fs.readdirSync(
            directory,
            { withFileTypes: true }
        )) {
            if (
                entry.name === "node_modules" ||
                entry.name === ".git" ||
                entry.name === "dist" ||
                entry.name === "build"
            ) {
                continue;
            }

            const full = path.join(directory, entry.name);

            if (entry.isDirectory()) {
                walk(full);
                continue;
            }

            if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) {
                continue;
            }

            let content;

            try {
                content = fs.readFileSync(full, "utf8");
            } catch {
                continue;
            }

            const relative = path.relative(ROOT, full);

            if (/argMax\s*\(\s*wristSpeed\s*\)/.test(content)) {
                findings.push({
                    severity: "HIGH",
                    type: "release-detection",
                    file: relative,
                    finding:
                        "Global wrist-speed maximum appears to be used as release detection."
                });
            }

            if (
                /Math\.abs\s*\(\s*hipH\s*-\s*shH\s*\)/.test(content)
            ) {
                findings.push({
                    severity: "MEDIUM",
                    type: "angle-wrap",
                    file: relative,
                    finding:
                        "Raw hip/shoulder angle subtraction detected."
                });
            }

            if (/Stride length\s*\(plant\)/i.test(content)) {
                findings.push({
                    severity: "MEDIUM",
                    type: "metric-label",
                    file: relative,
                    finding:
                        "Potentially misleading stride-length terminology detected."
                });
            }
        }
    }

    for (const root of roots) {
        walk(path.join(ROOT, root));
    }

    if (findings.length === 0) {
        record("disk-fish-analysis-risk-scan", "PASS");
    } else {
        record("disk-fish-analysis-risk-scan", "FAILED", {
            findings
        });
    }
}

function writeReports(meta) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });

    const finishedAt = new Date();

    const overall =
        results.some(r => r.status === "FAILED")
            ? "FAILED"
            : results.some(r =>
                ["BLOCKED", "UNAVAILABLE"].includes(r.status)
            )
                ? "BLOCKED"
                : "PASS";

    const report = {
        project: "Disk-Fish",
        auditVersion: "1.0.0",
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs:
            finishedAt.getTime() -
            startedAt.getTime(),
        host: {
            platform: os.platform(),
            architecture: os.arch(),
            node: process.version
        },
        overall,
        ...meta,
        results
    };

    fs.writeFileSync(
        JSON_REPORT,
        JSON.stringify(report, null, 2) + "\n"
    );

    const lines = [
        "DISK-FISH SELF-CONTAINED PRODUCTION AUDIT",
        "=========================================",
        "",
        `OVERALL: ${overall}`,
        `STARTED: ${report.startedAt}`,
        `FINISHED: ${report.finishedAt}`,
        ""
    ];

    for (const result of results) {
        lines.push(
            `[${result.status}] ${result.name}`
        );

        if (result.reason) {
            lines.push(`  Reason: ${result.reason}`);
        }

        if (result.manager) {
            lines.push(`  Manager: ${result.manager}`);
        }

        if (result.version) {
            lines.push(`  Version: ${result.version}`);
        }

        if (result.branch) {
            lines.push(`  Branch: ${result.branch}`);
        }

        if (result.commit) {
            lines.push(`  Commit: ${result.commit}`);
        }

        if (result.files?.length) {
            lines.push("  Files:");

            for (const file of result.files) {
                lines.push(`    - ${file}`);
            }
        }

        lines.push("");
    }

    fs.writeFileSync(
        TEXT_REPORT,
        lines.join("\n")
    );

    console.log("\n============================================================");
    console.log(`AUDIT RESULT: ${overall}`);
    console.log(`JSON: ${path.relative(ROOT, JSON_REPORT)}`);
    console.log(`TEXT: ${path.relative(ROOT, TEXT_REPORT)}`);
    console.log("============================================================");

    return overall;
}

function main() {
    console.log("DISK-FISH SELF-CONTAINED PRODUCTION AUDIT");
    console.log("-----------------------------------------");

    verifyGit();
    verifyNode();

    const packageJson = readJson("package.json");

    if (!packageJson) {
        record("package.json", "BLOCKED", {
            reason: "package.json missing or invalid"
        });

        const overall = writeReports({
            packageManager: "UNKNOWN"
        });

        process.exitCode =
            overall === "PASS"
                ? 0
                : overall === "BLOCKED"
                    ? 2
                    : 1;

        return;
    }

    const pm = detectPackageManager();
    const scripts = Object.keys(
        packageJson.scripts ?? {}
    );

    verifyPackageManager(pm);

    if (pm) {
        installDependencies(pm);
    }

    /*
     * Run configured checks.
     *
     * We deliberately do not invent missing commands.
     */
    const checks = [
        ["lint", false],
        ["typecheck", false],
        ["type-check", false],
        ["test", false],
        ["test:run", false],
        ["build", true]
    ];

    const executed = new Set();

    for (const [script, required] of checks) {
        if (executed.has(script)) continue;

        if (scripts.includes(script) || required) {
            runScript(
                pm,
                scripts,
                script,
                required
            );

            executed.add(script);
        }
    }

    scanSecrets();
    diskFishRiskScan();

    const overall = writeReports({
        packageManager: pm ?? "UNKNOWN",
        configuredScripts: scripts
    });

    if (overall === "FAILED") {
        process.exitCode = 1;
    } else if (overall === "BLOCKED") {
        process.exitCode = 2;
    } else {
        process.exitCode = 0;
    }
}

try {
    main();
} catch (error) {
    console.error("\nFATAL AUDIT ERROR");
    console.error(error?.message ?? String(error));

    try {
        record("audit-engine", "FAILED", {
            reason: error?.message ?? String(error)
        });

        writeReports({
            fatalError: true
        });
    } catch {
        // Preserve original failure.
    }

    process.exitCode = 1;
}
