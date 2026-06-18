import re
import os

replacements = [
    (r'\bcourse\b', 'fishing trip'),
    (r'\bCourse\b', 'Fishing Trip'),
    (r'\bcourses\b', 'trips'),
    (r'\bCourses\b', 'Fishing Trips'),
    (r'\blesson\b', 'trip'),
    (r'\bLesson\b', 'Trip'),
    (r'\blessons\b', 'trips'),
    (r'\bLessons\b', 'Trips'),
    (r'\baide\b', 'guide'),
    (r'\bAide\b', 'Guide'),
    (r'\bmentor\b', 'guide'),
    (r'\bMentor\b', 'Guide'),
    (r'\blearner\b', 'angler'),
    (r'\bLearner\b', 'Angler'),
    (r'\btutor\b', 'guide'),
    (r'\bTutor\b', 'Guide'),
    (r'\bclassroom\b', 'trip room'),
    (r'\bClassroom\b', 'Trip room'),
    (r'\bcurriculum\b', 'trip plan'),
    (r'\bAIDE\b', 'GUIDE'),
    (r'\bMENTOR\b', 'GUIDE'),
    (r'\bLEARNER\b', 'ANGLER'),
    (r'\bAIMENTORING\b', 'AIGUIDING'),
    (r'\bMentoring\b', 'Guiding'),
]

files = [
    "src/lib/content.ts",
    "src/lib/alert-templates.defaults.ts",
    "src/lib/category-placeholders.ts",
    "src/data/lesson-paths.ts",
    "src/routes/onboarding.learner.tsx",
    "src/routes/onboarding.learner.results.tsx",
    "src/routes/onboarding.learner.pace.tsx",
    "src/routes/onboarding.learner.device.tsx",
    "src/routes/trust-and-safety.tsx",
    "src/routes/acceptable-use-policy.tsx",
    "src/routes/cancellation-policy.tsx",
    "src/routes/data-handling.tsx",
    "src/routes/security.tsx",
    "src/routes/privacy.tsx",
    "src/routes/terms.tsx",
]

def replace_in_string(content):
    # Regex to find string literals: '...', "...", `...`
    # We use a simple regex that doesn't handle nested quotes or escaped quotes perfectly,
    # but should be good enough for typical content files.
    # Better approach: find all string matches and only replace within them.
    
    # This regex matches '...', "...", and `...`
    # It handles basic escaped characters like \' or \"
    string_pattern = r'(\'(?:\\.|[^\'])*\'|"(?:\\.|[^"])*"|`(?:\\.|[^`])*`)'
    
    def subst(match):
        s = match.group(0)
        # Skip if it looks like an import path (starts with @/ or ./)
        if s.startswith(("'@/", "'./", '"@/', '"./')):
            return s
        
        # Apply replacements
        new_s = s
        for pattern, repl in replacements:
            # Avoid replacing inside variable placeholders {{...}}
            # We split by {{ and }} and only replace outside them.
            parts = re.split(r'(\{\{.*?\}\})', new_s)
            for i in range(0, len(parts), 2):
                parts[i] = re.sub(pattern, repl, parts[i])
            new_s = "".join(parts)
        return new_s

    return re.sub(string_pattern, subst, content)

for file_path in files:
    if not os.path.exists(file_path):
        print(f"Skipping {file_path} (not found)")
        continue
    with open(file_path, 'r') as f:
        content = f.read()
    
    new_content = replace_in_string(content)
    
    if content != new_content:
        with open(file_path, 'w') as f:
            f.write(new_content)
        print(f"Updated {file_path}")
    else:
        print(f"No changes in {file_path}")

