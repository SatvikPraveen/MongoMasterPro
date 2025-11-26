#!/bin/bash
# MongoMasterPro - Backup and Restore Utility
# Automates database backup and restoration

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="mongomasterpro_backup_${TIMESTAMP}"

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Function: Backup MongoDB
backup_database() {
    print_header "MONGODB BACKUP UTILITY"
    
    # Create backups directory
    mkdir -p "$BACKUP_DIR"
    
    FULL_BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
    mkdir -p "$FULL_BACKUP_PATH"
    
    print_info "Starting backup..."
    print_info "Destination: $FULL_BACKUP_PATH"
    
    # Backup using mongodump
    docker exec mongo-primary mongodump \
        -u admin \
        -p mongomaster123 \
        --authenticationDatabase admin \
        --out "$FULL_BACKUP_PATH" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        print_success "Database backup completed"
        
        # Calculate backup size
        BACKUP_SIZE=$(du -sh "$FULL_BACKUP_PATH" | cut -f1)
        print_info "Backup size: $BACKUP_SIZE"
        
        # Create metadata file
        cat > "$FULL_BACKUP_PATH/BACKUP_INFO.txt" << EOF
MongoMasterPro Backup Information
================================
Backup Date: $(date)
Backup Directory: $FULL_BACKUP_PATH
Backup Size: $BACKUP_SIZE
Hostname: $(hostname)
Database: learning_platform, learning_platform_logs, learning_platform_analytics
Collections:
  - users
  - courses
  - enrollments
  - reviews
  - categories
  - analytics_events

To restore this backup, run:
  ./backup-restore.sh restore $FULL_BACKUP_PATH
EOF
        
        print_success "Backup metadata saved"
        print_success "Backup completed at: $FULL_BACKUP_PATH"
        
        # Optional: Create archive
        print_info "Creating compressed archive..."
        tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" -C "$BACKUP_DIR" "$BACKUP_NAME" 2>/dev/null
        print_success "Archive created: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
        
    else
        print_error "Backup failed!"
        exit 1
    fi
}

# Function: List available backups
list_backups() {
    print_header "AVAILABLE BACKUPS"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        print_error "No backups found"
        return
    fi
    
    echo -e "\n${BLUE}Backup Archives:${NC}"
    ls -lh "$BACKUP_DIR"/*.tar.gz 2>/dev/null || echo "No tar.gz archives found"
    
    echo -e "\n${BLUE}Backup Directories:${NC}"
    ls -d "$BACKUP_DIR"/mongomasterpro_backup_* 2>/dev/null | while read dir; do
        SIZE=$(du -sh "$dir" | cut -f1)
        DATE=$(basename "$dir" | sed 's/mongomasterpro_backup_//')
        echo "  • $DATE (Size: $SIZE)"
    done
}

# Function: Restore from backup
restore_database() {
    if [ -z "$1" ]; then
        print_error "Restore path required"
        echo "Usage: $0 restore <backup_path>"
        exit 1
    fi
    
    RESTORE_PATH="$1"
    
    if [ ! -d "$RESTORE_PATH" ]; then
        print_error "Backup path not found: $RESTORE_PATH"
        exit 1
    fi
    
    print_header "MONGODB RESTORE UTILITY"
    print_info "Restoring from: $RESTORE_PATH"
    
    read -p "This will overwrite existing data. Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Restore cancelled"
        return
    fi
    
    # Create restore container if needed
    if ! docker ps | grep -q mongo-primary; then
        print_info "Starting MongoDB container..."
        make start
        sleep 15
    fi
    
    print_info "Starting restoration..."
    
    # Restore using mongorestore
    docker exec mongo-primary mongorestore \
        -u admin \
        -p mongomaster123 \
        --authenticationDatabase admin \
        --dir "$RESTORE_PATH" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        print_success "Database restoration completed"
        print_success "Data restored successfully"
        
        # Verify restoration
        print_info "Verifying restoration..."
        COLLECTIONS=$(docker exec mongo-primary mongosh learning_platform --eval "db.getCollectionNames()" --quiet 2>/dev/null | wc -l)
        print_info "Collections found: $COLLECTIONS"
        
    else
        print_error "Restoration failed!"
        exit 1
    fi
}

# Function: Clean old backups
cleanup_backups() {
    print_header "BACKUP CLEANUP"
    
    DAYS_TO_KEEP=${1:-7}
    print_info "Removing backups older than $DAYS_TO_KEEP days"
    
    find "$BACKUP_DIR" -name "mongomasterpro_backup_*" -type d -mtime +$DAYS_TO_KEEP -exec rm -rf {} \; 2>/dev/null || true
    find "$BACKUP_DIR" -name "mongomasterpro_backup_*.tar.gz" -type f -mtime +$DAYS_TO_KEEP -delete 2>/dev/null || true
    
    print_success "Cleanup completed"
}

# Function: Show usage
show_usage() {
    cat << EOF
MongoMasterPro - Backup & Restore Utility

Usage:
  ./backup-restore.sh backup              Create a new backup
  ./backup-restore.sh restore <path>      Restore from backup
  ./backup-restore.sh list                List available backups
  ./backup-restore.sh cleanup [days]      Remove old backups (default: 7 days)
  ./backup-restore.sh help                Show this help message

Examples:
  # Create backup
  ./backup-restore.sh backup

  # Restore from backup
  ./backup-restore.sh restore ./backups/mongomasterpro_backup_20240101_120000

  # List all backups
  ./backup-restore.sh list

  # Remove backups older than 30 days
  ./backup-restore.sh cleanup 30

EOF
}

# Main script logic
case "${1:-help}" in
    backup)
        backup_database
        ;;
    restore)
        restore_database "$2"
        ;;
    list)
        list_backups
        ;;
    cleanup)
        cleanup_backups "$2"
        ;;
    help)
        show_usage
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac

