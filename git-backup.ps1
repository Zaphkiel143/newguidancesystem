# Navigate to your project directory
cd "C:\Users\Jeron\newGuidanceSystem\guidancesystem"

# Check git status for changes
$status = git status --porcelain

if ($status) {
    # Add all updated or new files
    git add .
    
    # Commit with a timestamped message
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    git commit -m "Auto-backup: $timestamp"
    
    # Push changes to your branch
    git push origin main
}