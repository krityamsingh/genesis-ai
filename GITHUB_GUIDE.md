# 🛠️ GENESIS — GitHub Developer Guide

This guide contains the most common commands you'll need for managing the Genesis AI project.

---

## 🔄 How to Merge Branches
Use these steps when your feature branch (e.g., `krityam-All`) is ready and you want to move the code to your main branch (`dev-main`).

1. **Switch to the main branch**:
   ```bash
   git checkout dev-main
   ```
2. **Pull the latest changes from GitHub** (to stay in sync):
   ```bash
   git pull origin dev-main
   ```
3. **Merge your feature branch**:
   ```bash
   git merge krityam-All
   ```
4. **Push the merged code to GitHub**:
   ```bash
   git push origin dev-main
   ```

---

## 📝 Daily Commands

### 1. Save Your Work (Commit)
```bash
git add .
git commit -m "Describe what YOU changed here"
```

### 2. Update GitHub (Push)
```bash
git push origin <your-branch-name>
```

### 3. Get Updates from GitHub (Pull)
```bash
git pull origin <your-branch-name>
```

---

## 🛡️ Security Best Practices

### NEVER Commit your `.env` File
Your `.env` contains your private HuggingFace and ChromaDB keys. If you push this to GitHub, anyone can use your tokens.

*   Ensure `.env` is listed in your `.gitignore` file.
*   If you accidentally add it, run this to remove it from Git while keeping the file on your computer:
    ```bash
    git rm --cached .env
    git commit -m "Security: remove sensitive config"
    ```

---

## 🌿 Branch Management

### Create a new feature branch:
```bash
git checkout -b my-new-feature
```

### Delete a branch (after merging):
```bash
git branch -d branch-name           # Delete locally
git push origin --delete branch-name # Delete on GitHub
```

### Check status:
```bash
git status   # See what files changed
git branch   # See which branch you are on
```
