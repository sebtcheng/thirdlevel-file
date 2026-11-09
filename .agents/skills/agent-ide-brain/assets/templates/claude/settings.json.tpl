{
  "permissions": {
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)",
      "Edit(./.env)",
      "Edit(./.env.*)",
      "Edit(./secrets/**)",
      "Read(./**/.env)",
      "Read(./**/.env.*)"
    ],
    "allow": [
      "Bash(git status)",
      "Bash(git diff)"
    ],
    "ask": [
      "Bash(ssh *)",
      "Bash(scp *)",
      "Bash(psql *)",
      "Bash(pg_dump *)",
      "Bash(pg_restore *)",
      "Bash(pm2 delete *)",
      "Bash(redis-cli *)"
    ]
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|Edit|Write|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/pre-tool-guard.mjs",
            "timeout": 5
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/post-edit-format.mjs",
            "timeout": 5
          }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/post-edit-format.mjs",
            "timeout": 5
          }
        ]
      }
    ],
    "PreCompact": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/pre-compact-save.mjs",
            "timeout": 5
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/session-start-restore.mjs",
            "timeout": 5
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/stop-gate.mjs",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
