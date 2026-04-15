with open('src/components/ui/Button.tsx', 'r') as f:
    content = f.read()

content = content.replace("sm: 'text-sm px-3 py-1.5 rounded-lg gap-1.5'", "sm: 'text-xs px-2.5 py-1 rounded-md gap-1.5'")
content = content.replace("md: 'text-sm px-4 py-2 rounded-xl gap-2'", "md: 'text-sm px-3 py-1.5 rounded-lg gap-2'")
content = content.replace("lg: 'text-base px-6 py-3 rounded-xl gap-2.5'", "lg: 'text-sm px-4 py-2 rounded-lg gap-2'")

with open('src/components/ui/Button.tsx', 'w') as f:
    f.write(content)
