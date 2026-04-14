with open('src/components/ui/Card.tsx', 'r') as f:
    content = f.read()

content = content.replace("rounded-2xl", "rounded-lg")
content = content.replace("'p-4 sm:p-6'", "'p-3 sm:p-4'")
content = content.replace("'p-6 sm:p-8'", "'p-4 sm:p-6'")
content = content.replace("'p-3'", "'p-2'")

with open('src/components/ui/Card.tsx', 'w') as f:
    f.write(content)
