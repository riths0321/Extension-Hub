# 🛠️ Extension Hub: Developer Git Guide

This guide outlines the professional workflow for keeping your development branch (`saurabh`) synchronized with the `main` branch and deploying your updates safely.

---

## 📋 Standard Workflow (Recommended)

Follow these steps in order to minimize conflicts and ensure a clean history.

### Step 1: Stage and Commit Your Work
Before pulling any new code, ensure your current changes are saved.
```bash
git add .
git commit -m "feat: add privacy policy for [extension-name]"
```

### Step 2: Sync with the Main Branch
Bring in the latest updates from the team. Using the `--no-rebase` flag ensures a standard merge.
```bash
git pull origin main --no-rebase
```

### Step 3: Handle Conflicts (If Any) ⚠️
If Git says "Automatic merge failed," don't panic. 
- **For Index Files:** Since `index.html` and `privacy_index.html` are auto-generated, it's often easiest to take the version from `main` and then regenerate them.
  ```bash
  git checkout --theirs index.html privacy_index.html
  git add index.html privacy_index.html
  ```
- **For Scripts/Logic:** Open the file, look for `<<<<<<< HEAD` markers, choose the correct code, and then:
  ```bash
  git add [file-name]
  ```
- **Finish the Merge:**
  ```bash
  git commit -m "merge: sync with main and resolve conflicts"
  ```

### Step 4: Regenerate Policy Indices
Always run the automation script after a merge to ensure your new policies are included in the updated index.
```bash
python3 scripts/manage_policies.py
```
*After running this, stage the updated indices:*
```bash
git add index.html privacy_index.html
git commit -m "chore: regenerate indices"
```

### Step 5: Push to Origin
Deploy your changes to the remote repository.
```bash
git push origin saurabh
```

---

## 💡 Pro Tips for a Conflict-Free Life

> [!TIP]
> **Commit Often:** Smaller commits are much easier to merge than one giant month-long change.

> [!IMPORTANT]
> **Pull Daily:** Even if you aren't ready to push, pulling `main` into your branch every morning keeps the gap small and conflicts easy to manage.

> [!WARNING]
> **Check Your Branch:** Always ensure you are on `saurabh` before starting work:
> ```bash
> git branch
> ```

---

## 🚀 Quick Command Cheat Sheet

| Task | Command |
| :--- | :--- |
| **Check Status** | `git status` |
| **Sync Main** | `git pull origin main --no-rebase` |
| **Regen Index** | `python3 scripts/manage_policies.py` |
| **Push Work** | `git push origin saurabh` |
| **Undo Last Commit** | `git reset --soft HEAD~1` |

---
&copy; 2026 ANSLATION COMPANY · Developer Toolkit
