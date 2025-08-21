#!/bin/bash

# Targeted Database Column Name Update Script
# This script handles the specific patterns found in your codebase

echo "🎯 Starting targeted column name updates..."
echo "📁 Working directory: $(pwd)"
echo ""

# Create backup
echo "💾 Creating backup..."
mkdir -p backups/$(date +%Y%m%d_%H%M%S)
cp -r backend/src backups/$(date +%Y%m%d_%H%M%S)/
echo "✅ Backup created in backups/$(date +%Y%m%d_%H%M%S)/"
echo ""

# Function to update with context
update_with_context() {
    local old_pattern="$1"
    local new_pattern="$2"
    local description="$3"
    
    echo "🔄 Updating: $old_pattern → $new_pattern"
    echo "   📝 $description"
    
    # Find files containing the pattern
    local files=$(grep -r -l "$old_pattern" backend/src/ 2>/dev/null)
    
    if [ -n "$files" ]; then
        echo "   📁 Files to update:"
        echo "$files" | sed 's/^/      /'
        
        # Perform replacement
        sed -i "s/$old_pattern/$new_pattern/g" $files
        
        echo "   ✅ Updated successfully"
    else
        echo "   ℹ️  No files found with $old_pattern"
    fi
    echo ""
}

echo "🔑 Primary Key Updates..."
update_with_context "companyid" "id" "Companies table primary key (when used as PK)"
update_with_context "productid" "id" "Products table primary key (when used as PK)"
update_with_context "quoteid" "id" "Quotes table primary key (when used as PK)"
update_with_context "customerid" "id" "Customers table primary key (when used as PK)"

echo "🔗 Foreign Key Updates..."
update_with_context "companyid" "company_id" "Foreign key references to companies table"
update_with_context "customerid" "customer_id" "Foreign key references to customers table"
update_with_context "productid" "product_id" "Foreign key references to products table"
update_with_context "quoteid" "quote_id" "Foreign key references to quotes table"

echo "📝 Column Name Updates..."
update_with_context "customername" "customer_name" "Customer name field"
update_with_context "productname" "product_name" "Product name field"
update_with_context "orderstatus" "status" "Order status field"
update_with_context "pickingstatus" "picking_status" "Picking status field"
update_with_context "timestarted" "created_at" "Timestamp when record was created"
update_with_context "lastmodified" "updated_at" "Timestamp when record was last modified"
update_with_context "totalamount" "total_amount" "Total amount field"
update_with_context "ordernote" "order_note" "Order note field"
update_with_context "pickernote" "picker_note" "Picker note field"
update_with_context "originalqty" "original_quantity" "Original quantity field"
update_with_context "pickingqty" "picking_quantity" "Picking quantity field"

echo "🎯 Targeted updates completed!"
echo ""
echo "⚠️  CRITICAL: You need to handle these special cases manually:"
echo ""
echo "1. 🆔 Company ID Type Change (varchar → UUID):"
echo "   - Update session handling in authController.js"
echo "   - Update company ID generation/validation"
echo "   - Handle UUID vs string comparisons"
echo ""
echo "2. 🔄 Status Field ENUM Updates:"
echo "   - Update hardcoded status values in SQL queries"
echo "   - Change 'pending' to 'pending'::order_status"
echo "   - Change 'checking' to 'checking'::order_status"
echo "   - Change 'finalised' to 'finalised'::order_status"
echo ""
echo "3. 📊 SQL Query Updates:"
echo "   - Update INSERT statements with new column names"
echo "   - Update UPDATE statements with new column names"
echo "   - Update SELECT statements with new column names"
echo "   - Update WHERE clauses with new column names"
echo ""
echo "4. 🧪 Testing Required:"
echo "   - Test all CRUD operations"
echo "   - Test authentication and sessions"
echo "   - Test all API endpoints"
echo "   - Test status field updates"
echo ""
echo "🔍 Verification commands:"
echo "   grep -r 'company_id' backend/src/"
echo "   grep -r 'product_name' backend/src/"
echo "   grep -r 'status' backend/src/"
echo "   grep -r 'picking_status' backend/src/"
echo ""
echo "📋 Migration order:"
echo "   1. Run this script to update column names"
echo "   2. Update database schema"
echo "   3. Fix special cases manually"
echo "   4. Test thoroughly"
echo "   5. Deploy to production"
