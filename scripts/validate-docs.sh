#!/bin/bash
set -euo pipefail

echo "🔍 Memulai validasi konsistensi dokumen..."

# 1. Validasi environment variable di .env.example vs docs/ENVIRONMENT.md
echo "1. Memvalidasi environment variable..."
echo "   - Memeriksa .env.example..."
if [ ! -f ".env.example" ]; then
    echo "   ⚠️  File .env.example tidak ditemukan, lewati validasi."
else
    # Extract environment variables dari .env.example (format: KEY=VALUE)
    env_vars=$(grep -E '^[a-zA-Z_][a-zA-Z0-9_]*=' .env.example | cut -d= -f1 | sort)
    if [ -z "$env_vars" ]; then
        echo "   ⚠️  Tidak ada environment variable ditemukan di .env.example."
    else
        echo "   - Ditemukan $(echo "$env_vars" | wc -l) environment variable di .env.example"
        
        # Baca ENVIRONMENT.md dan extract environment variables
        if [ ! -f "docs/ENVIRONMENT.md" ]; then
            echo "   ❌ ERROR: File docs/ENVIRONMENT.md tidak ditemukan!"
            exit 1
        fi
        
        echo "   - Memeriksa dokumentasi di docs/ENVIRONMENT.md..."
        documented_vars=$(grep -E '\| *[a-zA-Z_][a-zA-Z0-9_]* *\|' docs/ENVIRONMENT.md | grep -v '^[|`]' | awk -F'|' '{print $2}' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | grep -E '^[a-zA-Z_][a-zA-Z0-9_]*$' | sort)
        
        # Bandingkan environment variables
        missing_docs=""
        while IFS= read -r env_var; do
            if ! echo "$documented_vars" | grep -qxF "$env_var"; then
                missing_docs+="$env_var "
            fi
        done <<< "$env_vars"
        
        if [ -n "$missing_docs" ]; then
            echo "   ❌ ERROR: Environment variable berikut belum didokumentasikan:"
            for var in $missing_docs; do
                echo "      - $var"
            done
            exit 1
        else
            echo "   ✅ Semua environment variable sudah didokumentasikan dengan benar."
        fi
    fi
fi

# 2. Validasi migration SQL vs docs/MIGRATIONS.md
echo "2. Memvalidasi migration SQL..."
echo "   - Memeriksa file migration SQL..."
migration_files=$(find . -name "*.sql" -path "*/migrations/*" ! -path "*/seed/*" | sort)
if [ -z "$migration_files" ]; then
    echo "   ⚠️  Tidak ada file migration SQL ditemukan."
else
    echo "   - Ditemukan $(echo "$migration_files" | wc -l) file migration SQL"
    
    # Baca MIGRATIONS.md dan extract migration filenames
    if [ ! -f "docs/MIGRATIONS.md" ]; then
        echo "   ❌ ERROR: File docs/MIGRATIONS.md tidak ditemukan!"
        exit 1
    fi
    
    echo "   - Memeriksa dokumentasi di docs/MIGRATIONS.md..."
    documented_migrations=$(grep -E '\| *[0-9]+_' docs/MIGRATIONS.md | awk -F'|' '{print $2}' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | sort)
    
    # Bandingkan migration files
    missing_docs=""
    while IFS= read -r migration_file; do
        # Extract nama file dari path
        filename=$(basename "$migration_file")
        if ! echo "$documented_migrations" | grep -qxF "$filename"; then
            missing_docs+="$filename "
        fi
    done <<< "$migration_files"
    
    if [ -n "$missing_docs" ]; then
        echo "   ❌ ERROR: Migration SQL berikut belum didokumentasikan:"
        for file in $missing_docs; do
            echo "      - $(basename "$file")"
        done
        exit 1
    else
        echo "   ✅ Semua migration SQL sudah didokumentasikan dengan benar."
    fi
fi

echo "✅ Semua validasi selesai dengan sukses!"