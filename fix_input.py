with open('src/components/ui/Input.tsx', 'r') as f:
    content = f.read()

content = content.replace("sm: 'text-sm px-3 py-1.5 rounded-lg'", "sm: 'text-xs px-2.5 py-1.5 rounded-md'")
content = content.replace("md: 'text-sm px-4 py-2.5 rounded-xl'", "md: 'text-sm px-3 py-2 rounded-lg'")
content = content.replace("lg: 'text-base px-4 py-3 rounded-xl'", "lg: 'text-sm px-4 py-2.5 rounded-lg'")
content = content.replace("sm: 'pl-9'", "sm: 'pl-8'")
content = content.replace("md: 'pl-10'", "md: 'pl-9'")
content = content.replace("lg: 'pl-11'", "lg: 'pl-10'")

with open('src/components/ui/Input.tsx', 'w') as f:
    f.write(content)
