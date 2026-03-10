export function soundex(s: string): string {
    const a = s.toLowerCase().replace(/[^a-z]/g, '').split('');
    const f = a.shift()?.toUpperCase();
    if (!f) return '';
    let r = '';
    const codes: { [key: string]: string } = {
        a: '', e: '', i: '', o: '', u: '', y: '',
        b: '1', f: '1', p: '1', v: '1',
        c: '2', g: '2', j: '2', k: '2', q: '2', s: '2', x: '2', z: '2',
        d: '3', t: '3',
        l: '4',
        m: '5', n: '5',
        r: '6',
        h: '', w: ''
    };
    let prevCode = codes[f.toLowerCase()] || '';
    for (let i = 0; i < a.length; i++) {
        const char = a[i];
        const code = codes[char];
        if (code !== undefined) {
            if (code !== '' && code !== prevCode) {
                r += code;
            }
            if (char !== 'h' && char !== 'w') {
                prevCode = code;
            }
        }
    }
    return (f + r + '000').slice(0, 4);
}

export function levenshteinDistance(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (s1[i - 1].toLowerCase() === s2[j - 1].toLowerCase()) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(
                    dp[i - 1][j], // deletion
                    dp[i][j - 1], // insertion
                    dp[i - 1][j - 1] // substitution
                );
            }
        }
    }
    return dp[m][n];
}

export interface CollisionWarning {
    name: string;
    reason: string;
    severity: 'high' | 'medium' | 'low';
}

export function analyzeNameCollisions(newName: string, existingNames: string[]): CollisionWarning[] {
    if (!newName.trim()) return [];

    const warnings: CollisionWarning[] = [];
    const newSoundex = soundex(newName);

    for (const existing of existingNames) {
        if (existing.toLowerCase() === newName.toLowerCase()) {
            warnings.push({ name: existing, reason: "Exact match", severity: 'high' });
            continue;
        }

        const dist = levenshteinDistance(newName, existing);
        const existingSoundex = soundex(existing);

        let severity: 'high' | 'medium' | 'low' | null = null;
        let reason = '';

        if (newSoundex === existingSoundex) {
            reason = 'Phonetically identical (Soundex match)';
            severity = 'high';
        } else if (dist <= 2 && newName.length > 4) {
            reason = 'Very similar spelling';
            severity = 'medium';
        }

        if (severity) {
            warnings.push({ name: existing, reason, severity });
        }
    }

    // Sort by severity (high first)
    return warnings.sort((a, b) => {
        if (a.severity === 'high' && b.severity !== 'high') return -1;
        if (a.severity !== 'high' && b.severity === 'high') return 1;
        return 0;
    });
}
