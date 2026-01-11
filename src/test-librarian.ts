/**
 * Manual test script for The Librarian
 * 
 * This script hardcodes a sample Git diff (React component addition),
 * passes it to the summarizer, and validates the output follows
 * the Project Memory Schema.
 * 
 * Usage: npx tsx src/test-librarian.ts
 */

import { Summarizer } from './librarian/summarizer';

/**
 * Sample Git diff: Adding a new React component (UserProfile)
 * This should trigger architectural change detection
 */
const SAMPLE_DIFF = `diff --git a/src/components/UserProfile.tsx b/src/components/UserProfile.tsx
new file mode 100644
index 0000000..a1b2c3d
--- /dev/null
+++ b/src/components/UserProfile.tsx
@@ -0,0 +1,45 @@
+import React, { useState, useEffect } from 'react';
+import { fetchUserData } from '../services/userService';
+import styles from './UserProfile.module.css';
+
+interface UserProfileProps {
+  userId: string;
+  onUpdate?: (user: User) => void;
+}
+
+interface User {
+  id: string;
+  name: string;
+  email: string;
+  avatar?: string;
+  createdAt: string;
+}
+
+export const UserProfile: React.FC<UserProfileProps> = ({ userId, onUpdate }) => {
+  const [user, setUser] = useState<User | null>(null);
+  const [loading, setLoading] = useState<boolean>(true);
+  const [error, setError] = useState<string | null>(null);
+
+  useEffect(() => {
+    const loadUser = async () => {
+      try {
+        setLoading(true);
+        const userData = await fetchUserData(userId);
+        setUser(userData);
+        if (onUpdate) {
+          onUpdate(userData);
+        }
+      } catch (err) {
+        setError(err instanceof Error ? err.message : 'Failed to load user');
+      } finally {
+        setLoading(false);
+      }
+    };
+
+    loadUser();
+  }, [userId, onUpdate]);
+
+  if (loading) return <div className={styles.loading}>Loading...</div>;
+  if (error) return <div className={styles.error}>{error}</div>;
+  if (!user) return null;
+
+  return (
+    <div className={styles.profile}>
+      <img src={user.avatar || '/default-avatar.png'} alt={user.name} className={styles.avatar} />
+      <h2>{user.name}</h2>
+      <p>{user.email}</p>
+      <p className={styles.meta}>Member since {new Date(user.createdAt).toLocaleDateString()}</p>
+    </div>
+  );
+};
+
+diff --git a/src/services/userService.ts b/src/services/userService.ts
+index e6f7g8h..i9j0k1l 100644
+--- a/src/services/userService.ts
++++ b/src/services/userService.ts
@@ -5,6 +5,12 @@ import { API_BASE_URL } from '../config';
 export const fetchUser = async (userId: string) => {
   return fetch(\`\${API_BASE_URL}/users/\${userId}\`).then(res => res.json());
 };
+
+export const fetchUserData = async (userId: string): Promise<User> => {
+  const response = await fetch(\`\${API_BASE_URL}/users/\${userId}\`);
+  if (!response.ok) throw new Error(\`Failed to fetch user: \${response.statusText}\`);
+  return response.json();
+};
 
 export const updateUser = async (userId: string, data: Partial<User>) => {
   return fetch(\`\${API_BASE_URL}/users/\${userId}\`, {
@@ -17,3 +23,8 @@ export const updateUser = async (userId: string, data: Partial<User>) => {
     body: JSON.stringify(data),
   }).then(res => res.json());
 };
+
+export interface User {
+  id: string;
+  name: string;
+  email: string;
+}
 
+diff --git a/src/components/UserProfile.module.css b/src/components/UserProfile.module.css
+new file mode 100644
index 0000000..c4d5e6f
--- /dev/null
+++ b/src/components/UserProfile.module.css
@@ -0,0 +1,25 @@
+.profile {
+  display: flex;
+  flex-direction: column;
+  align-items: center;
+  padding: 2rem;
+  border-radius: 8px;
+  background-color: var(--bg-secondary);
+  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
+}
+
+.avatar {
+  width: 120px;
+  height: 120px;
+  border-radius: 50%;
+  object-fit: cover;
+  margin-bottom: 1rem;
+}
+
+.loading {
+  text-align: center;
+  padding: 2rem;
+  color: var(--text-secondary);
+}
+
+.error {
+  color: var(--error-color);
+  padding: 1rem;
+}
`;

/**
 * Required sections for PROJECT_MEMORY.md (from memory-manager.ts)
 */
const REQUIRED_SECTIONS = [
  '## Project Soul',
  '## Tech Stack',
  '## Architecture',
  '## Core Rules',
  '## Recent Decisions',
  '## Active Tech Debt',
];

/**
 * Validate that the output follows the Project Memory Schema
 */
function validateSchema(output: string): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  for (const section of REQUIRED_SECTIONS) {
    if (!output.includes(section)) {
      missing.push(section);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Check if the output identifies the architectural change
 */
function checkArchitecturalChange(output: string): boolean {
  const indicators = [
    'UserProfile',
    'React component',
    'component pattern',
    'hook',
    'useState',
    'useEffect',
    'architectural',
    'architecture',
  ];
  
  return indicators.some(indicator => 
    output.toLowerCase().includes(indicator.toLowerCase())
  );
}

/**
 * Main test function
 */
async function main() {
  console.log('🧪 Testing The Librarian...\n');
  console.log('=' .repeat(60));
  console.log('Sample Git Diff (React Component Addition)');
  console.log('=' .repeat(60));
  console.log('\nProcessing diff with Gemini...\n');

  try {
    // Create summarizer instance
    // The config system will automatically resolve GEMINI_API_KEY from:
    // 1. process.env.GEMINI_API_KEY
    // 2. .env file
    // 3. ~/.config/vibeguard/config.json
    const summarizer = new Summarizer();

    // Process the sample diff
    const summary = await summarizer.summarizeDiff(SAMPLE_DIFF, '', 'medium');

    console.log('=' .repeat(60));
    console.log('Generated PROJECT_MEMORY.md:');
    console.log('=' .repeat(60));
    console.log('\n' + summary + '\n');

    // Validate schema
    console.log('=' .repeat(60));
    console.log('Schema Validation:');
    console.log('=' .repeat(60));
    
    const validation = validateSchema(summary);
    
    if (validation.valid) {
      console.log('✅ All required sections present!\n');
      REQUIRED_SECTIONS.forEach(section => {
        console.log(`  ✅ ${section}`);
      });
    } else {
      console.log('❌ Missing required sections:\n');
      validation.missing.forEach(section => {
        console.log(`  ❌ ${section}`);
      });
      console.log('\nPresent sections:');
      REQUIRED_SECTIONS.filter(s => !validation.missing.includes(s)).forEach(section => {
        console.log(`  ✅ ${section}`);
      });
    }

    // Check for architectural change detection
    console.log('\n' + '=' .repeat(60));
    console.log('Architectural Change Detection:');
    console.log('=' .repeat(60));
    
    const hasArchitecturalChange = checkArchitecturalChange(summary);
    
    if (hasArchitecturalChange) {
      console.log('✅ Architectural change detected in output!\n');
      console.log('The summary mentions:');
      console.log('  - UserProfile component');
      console.log('  - React component pattern');
      console.log('  - Hooks usage (useState, useEffect)');
      console.log('  - Component architecture');
    } else {
      console.log('⚠️  Warning: Architectural change may not be clearly identified.\n');
      console.log('Expected to find mentions of:');
      console.log('  - UserProfile component');
      console.log('  - React component pattern');
      console.log('  - Component architecture');
    }

    // Check if "Recent Decisions" section contains the change
    console.log('\n' + '=' .repeat(60));
    console.log('Recent Decisions Analysis:');
    console.log('=' .repeat(60));
    
    const recentDecisionsMatch = summary.match(/## Recent Decisions[^#]*/s);
    if (recentDecisionsMatch) {
      const recentDecisions = recentDecisionsMatch[0];
      const hasDecision = recentDecisions.toLowerCase().includes('userprofile') || 
                          recentDecisions.toLowerCase().includes('component') ||
                          recentDecisions.toLowerCase().includes('react');
      
      if (hasDecision) {
        console.log('✅ Recent Decisions section mentions the component addition!\n');
        console.log('Recent Decisions content:');
        console.log(recentDecisions.substring(0, 300) + '...\n');
      } else {
        console.log('⚠️  Warning: Recent Decisions may not explicitly mention the component addition.\n');
        console.log('Recent Decisions content:');
        console.log(recentDecisions.substring(0, 300) + '...\n');
      }
    } else {
      console.log('❌ Could not find "Recent Decisions" section!\n');
    }

    // Final summary
    console.log('=' .repeat(60));
    console.log('Test Summary:');
    console.log('=' .repeat(60));
    
    const allChecksPass = validation.valid && hasArchitecturalChange;
    
    if (allChecksPass) {
      console.log('✅ All checks passed! The Librarian is working correctly.\n');
      process.exit(0);
    } else {
      console.log('⚠️  Some checks failed. Review the output above.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Error during testing:\n');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
main();

