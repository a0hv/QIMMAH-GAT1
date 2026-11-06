// Universal Complete API Client for Al-Qimmah Platform
// Matches EXACT contract of server/routes for full frontend compatibility

const API = {
  // Google Firebase Cloud Firestore Configuration (Project: qimmah-gat)
  firebaseConfig: {
    apiKey: "AIzaSyASbmJIRURFamOtF7iltXjgr20pgFz6LvM",
    authDomain: "qimmah-gat.firebaseapp.com",
    projectId: "qimmah-gat",
    storageBucket: "qimmah-gat.firebasestorage.app",
    messagingSenderId: "266878020764",
    appId: "1:266878020764:web:8f1c2dbfb6fbbf5c219159",
    measurementId: "G-5CZ09LBN3X"
  },

  firebaseApp: null,
  db: null,
  isCloudReady: false,
  _seeded: false,

  initFirebase() {
    if (this.db) return this.db;
    try {
      if (typeof firebase !== 'undefined' && firebase.initializeApp) {
        if (!firebase.apps || !firebase.apps.length) {
          this.firebaseApp = firebase.initializeApp(this.firebaseConfig);
        } else {
          this.firebaseApp = firebase.app();
        }
        this.db = firebase.firestore();

        // Enable offline persistence
        try {
          this.db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
        } catch (e) {}

        this.isCloudReady = true;
        this.updateCloudStatusBadge(true);
        this.autoSeedInitialData();
        this.syncCurrentStudentFromCloud();
        return this.db;
      }
    } catch (e) {
      console.warn('Firebase initialization notice:', e);
      this.isCloudReady = false;
      this.updateCloudStatusBadge(false);
    }
    return null;
  },

  updateCloudStatusBadge(isOnline) {
    const badge = document.getElementById('adminCloudStatusBadge');
    const text = document.getElementById('adminCloudStatusText');
    if (!badge) return;
    if (isOnline) {
      badge.className = 'hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold';
      if (text) text.textContent = 'سحابي متزامن (Firestore)';
    } else {
      badge.className = 'hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold';
      if (text) text.textContent = 'وضع التخزين المحلي';
    }
  },

  async autoSeedInitialData() {
    if (this._seeded || !this.db) return;
    this._seeded = true;
    try {
      // 1. Check students collection
      const studentsSnap = await this.db.collection('students').limit(1).get();
      if (studentsSnap.empty) {
        console.log('[Firestore] Seeding baseline students...');
        const baseline = [
          { id: 'std-105', name: 'طالب القمة المتميز', accessCode: 'QIMMAH-105', role: 'student', isActive: true, createdAt: '2026-10-23T00:00:00.000Z', attempts: [] },
          { id: 'std-100', name: 'بطل القدرات اللفظية', accessCode: 'QIMMAH-100', role: 'student', isActive: true, createdAt: '2026-10-23T00:00:00.000Z', attempts: [] },
          { id: 'std-2026', name: 'طالب متدرب 2026', accessCode: 'QIMMAH-2026', role: 'student', isActive: true, createdAt: '2026-10-23T00:00:00.000Z', attempts: [] }
        ];
        const batch = this.db.batch();
        baseline.forEach(s => {
          const docRef = this.db.collection('students').doc(s.accessCode);
          batch.set(docRef, s);
        });
        await batch.commit();
        console.log('[Firestore] Baseline students seeded successfully.');
      }

      // 2. Check platform settings
      const settingsDoc = await this.db.collection('platform_data').doc('settings').get();
      if (!settingsDoc.exists) {
        console.log('[Firestore] Seeding platform settings...');
        await this.db.collection('platform_data').doc('settings').set({
          platformName: 'منصة القمة في القدرات اللفظية',
          instructorName: 'الأستاذ جابر القاضي',
          instructorPhone: '0541378802',
          defaultExamDuration: 65,
          passingThresholdPercent: 75,
          certificateThresholdPercent: 80,
          allowStudentReview: true,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (e) {
      console.warn('[Firestore] Auto-seed non-fatal error:', e);
    }
  },

  // Real-time Firestore Student Listener for Admin and Multi-Device Sync
  subscribeStudents(callback) {
    this.initFirebase();
    if (!this.db) return null;
    try {
      return this.db.collection('students').onSnapshot(snap => {
        const list = [];
        snap.forEach(doc => {
          const data = doc.data();
          list.push({ id: doc.id, ...data });
        });
        if (list.length > 0) {
          this.saveStudentsList(list);
          if (typeof callback === 'function') callback(list);
        }
      }, err => {
        console.warn('[Firestore] Snapshot listener error:', err);
      });
    } catch (e) {
      return null;
    }
  },

  tokenKey: 'alqimmah_auth_token',
  userKey: 'alqimmah_auth_user',
  storageDbKey: 'alqimmah_local_db',

  getToken() {
    return localStorage.getItem(this.tokenKey);
  },

  setAuth(token, user) {
    if (token) localStorage.setItem(this.tokenKey, token);
    if (user) localStorage.setItem(this.userKey, JSON.stringify(user));
  },

  clearAuth() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  },

  // Pure JS Cryptographic SHA-256 Digest (Client-side Security Shield)
  sha256(ascii) {
    function rightRotate(value, amount) {
      return (value >>> amount) | (value << (32 - amount));
    }
    var mathPow = Math.pow;
    var maxWord = mathPow(2, 32);
    var lengthProperty = 'length';
    var i, j;
    var result = '';
    var words = [];
    var asciiBitLength = ascii[lengthProperty] * 8;
    var hash = [];
    var k = [];
    var primeCounter = 0;
    var isComposite = {};
    for (var candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) {
          isComposite[i] = candidate;
        }
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    ascii += '\x80';
    while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
    for (i = 0; i < ascii[lengthProperty]; i++) {
      j = ascii.charCodeAt(i);
      if (j >> 8) return '';
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
    words[words[lengthProperty]] = asciiBitLength;
    for (j = 0; j < words[lengthProperty];) {
      var w = words.slice(j, j += 16);
      var oldHash = hash;
      hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2];
        var a = hash[0], e = hash[4];
        var temp1 = hash[7]
          + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
          + ((e & hash[5]) ^ ((~e) & hash[6]))
          + k[i]
          + (w[i] = (i < 16) ? w[i] : (
              w[i - 16]
              + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
              + w[i - 7]
              + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
            ) | 0
          );
        var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
          + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      for (i = 0; i < 8; i++) {
        hash[i] = (hash[i] + oldHash[i]) | 0;
      }
    }
    for (i = 0; i < 8; i++) {
      for (var b = 3; b >= 0; b--) {
        var byte = (hash[i] >> (b * 8)) & 255;
        result += ((byte < 16) ? '0' : '') + byte.toString(16);
      }
    }
    return result;
  },

  getUser() {
    try {
      const u = localStorage.getItem(this.userKey);
      if (!u) return null;
      const parsed = JSON.parse(u);
      // Security Check: If user has role admin, verify active admin authorization
      if (parsed && parsed.role === 'admin') {
        if (parsed.adminSecretVersion !== 'v2026_da89de201b2e962f') {
          console.warn('[Security] Outdated or unauthorized admin session detected and revoked.');
          this.clearAuth();
          return null;
        }
      }
      return parsed;
    } catch (e) {
      return null;
    }
  },

  checkAnswerCorrectness(userChoice, question) {
    if (userChoice === undefined || userChoice === null || userChoice === '') {
      return false; // Unanswered is NEVER correct!
    }

    const letters = ['أ', 'ب', 'ج', 'د'];
    const correctLetter = String(question.correct || question.correctAnswer || '').trim();
    const chosenStr = String(userChoice).trim();

    // Direct match (letter or text)
    if (chosenStr === correctLetter) return true;

    // Numeric index match (0 -> 'أ', 1 -> 'ب', etc.)
    if (typeof userChoice === 'number' && letters[userChoice] === correctLetter) return true;
    const num = parseInt(chosenStr, 10);
    if (!isNaN(num) && num >= 0 && num < letters.length && letters[num] === correctLetter) return true;

    // Options array text matching
    if (Array.isArray(question.options)) {
      // If student answered with option text
      const chosenOptIdx = question.options.findIndex(o => o && o.trim() === chosenStr);
      if (chosenOptIdx !== -1 && letters[chosenOptIdx] === correctLetter) return true;

      // If question.correct is full option text and student answered with letter
      const letterIdx = letters.indexOf(chosenStr);
      if (letterIdx !== -1 && question.options[letterIdx] && question.options[letterIdx].trim() === correctLetter) return true;

      // If both are option text
      if (chosenOptIdx !== -1 && question.options[chosenOptIdx] && question.options[chosenOptIdx].trim() === correctLetter) return true;
    }

    return false;
  },

  getBundle() {
    if (window.QIMMAH_DATA) return window.QIMMAH_DATA;

    // De-obfuscation logic if data is encrypted
    if (window.QIMMAH_DATA_OBFUSCATED) {
      try {
        const key = [0x3A, 0x7D, 0x9E, 0xC1, 0x42, 0xF8, 0x6B, 0x55];
        const binary = atob(window.QIMMAH_DATA_OBFUSCATED);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i) ^ key[i % key.length];
        }
        window.QIMMAH_DATA = JSON.parse(new TextDecoder().decode(bytes));
        return window.QIMMAH_DATA;
      } catch (e) {
        console.error("Failed to decode bundle data", e);
      }
    }
    return null;
  },

  studentsListKey: 'alqimmah_students_list',

  getStudentsList() {
    try {
      const saved = localStorage.getItem(this.studentsListKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}

    // Initial default students
    const bundle = this.getBundle();
    const list = (bundle && Array.isArray(bundle.users) && bundle.users.filter(u => u.role === 'student').length > 0)
      ? bundle.users.filter(u => u.role === 'student')
      : [
          { id: 'std-105', name: 'طالب القمة المتميز', accessCode: 'QIMMAH-105', role: 'student', isActive: true, createdAt: '2026-10-23T00:00:00.000Z' },
          { id: 'std-100', name: 'بطل القدرات اللفظية', accessCode: 'QIMMAH-100', role: 'student', isActive: true, createdAt: '2026-10-23T00:00:00.000Z' },
          { id: 'std-2026', name: 'طالب متدرب 2026', accessCode: 'QIMMAH-2026', role: 'student', isActive: true, createdAt: '2026-10-23T00:00:00.000Z' }
        ];

    this.saveStudentsList(list);
    return list;
  },

  saveStudentsList(list) {
    try {
      localStorage.setItem(this.studentsListKey, JSON.stringify(list));
      const bundle = this.getBundle();
      if (bundle) {
        bundle.users = [
          ...(bundle.users || []).filter(u => u.role !== 'student'),
          ...list
        ];
      }
    } catch (e) {}
  },

  skillsTestsKey: 'alqimmah_skills_tests',
  farisExamsKey: 'alqimmah_faris_exams',
  customExamsKey: 'alqimmah_custom_exams',
  customSkillsKey: 'alqimmah_custom_skills',
  platformSettingsKey: 'alqimmah_platform_settings',

  // Validates exams data to ensure it does NOT have the stale repeated passage bug
  validateExamsData(exams) {
    if (!Array.isArray(exams) || exams.length === 0) return false;
    const ex1 = exams[0];
    if (ex1 && Array.isArray(ex1.questions)) {
      const rc = ex1.questions.filter(q => q.skill === 'reading' || q.skill === 'rc' || (q.passage && q.passage.length > 0));
      const passages = new Set(rc.map(q => q.passage).filter(Boolean));
      if (rc.length > 5 && passages.size <= 1) {
        // Discard stale cache with single passage bug!
        return false;
      }
    }
    return true;
  },

  // Clear stale cache keys that had duplicate passages
  purgeLegacyCache() {
    try {
      localStorage.removeItem('alqimmah_faris_exams');
      localStorage.removeItem('alqimmah_skills_tests');
      localStorage.removeItem('alqimmah_faris_exams_v2');
      localStorage.removeItem('alqimmah_skills_tests_v2');

      // Also validate custom exams key; if it contains stale data with 1 passage, purge it
      const customExams = localStorage.getItem(this.customExamsKey);
      if (customExams) {
        try {
          const parsed = JSON.parse(customExams);
          if (!this.validateExamsData(parsed)) {
            console.log('[Cache] Purging stale custom exams with duplicate passages.');
            localStorage.removeItem(this.customExamsKey);
          }
        } catch (e) {
          localStorage.removeItem(this.customExamsKey);
        }
      }
    } catch (e) {}
  },

  getSkillsTests() {
    this.purgeLegacyCache();
    // 1. Check if admin saved custom skill tests
    try {
      const s = localStorage.getItem(this.customSkillsKey);
      if (s) {
        const parsed = JSON.parse(s);
        if (parsed && Array.isArray(parsed.skills) && parsed.skills.length > 0) {
          const bundle = this.getBundle();
          if (bundle) bundle.skillsTests = parsed;
          return parsed;
        }
      }
    } catch (e) {}

    // 2. Default to official bundle.skillsTests
    const bundle = this.getBundle();
    return (bundle && bundle.skillsTests) ? bundle.skillsTests : { skills: [] };
  },

  saveSkillsTests(st) {
    try {
      localStorage.setItem(this.customSkillsKey, JSON.stringify(st));
    } catch (e) {
      console.error('Failed to save skills to localStorage', e);
    }
    const bundle = this.getBundle();
    if (bundle) bundle.skillsTests = st;
  },

  getFarisExams() {
    this.purgeLegacyCache();
    // 1. Check if admin saved custom exams
    try {
      const s = localStorage.getItem(this.customExamsKey);
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const bundle = this.getBundle();
          if (bundle) bundle.farisExams = parsed;
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to save exams from localStorage', e);
    }

    // 2. Default to official bundle.farisExams
    const bundle = this.getBundle();
    return (bundle && Array.isArray(bundle.farisExams)) ? bundle.farisExams : [];
  },

  saveFarisExams(exams) {
    try {
      localStorage.setItem(this.customExamsKey, JSON.stringify(exams));
    } catch (e) {
      console.error('Failed to save exams to localStorage', e);
    }
    const bundle = this.getBundle();
    if (bundle) bundle.farisExams = exams;
  },

  getPlatformSettings() {
    try {
      const s = localStorage.getItem(this.platformSettingsKey);
      if (s) return JSON.parse(s);
    } catch (e) {}

    const bundle = this.getBundle();
    return (bundle && bundle.settings) ? bundle.settings : {
      platformName: 'منصة القمة في القدرات اللفظية',
      instructorName: 'الأستاذ جابر القاضي',
      instructorPhone: '0541378802',
      defaultExamDuration: 65,
      passingThresholdPercent: 75,
      certificateThresholdPercent: 80,
      allowStudentReview: true
    };
  },

  savePlatformSettings(settings) {
    try {
      localStorage.setItem(this.platformSettingsKey, JSON.stringify(settings));
    } catch (e) {}
    const bundle = this.getBundle();
    if (bundle) bundle.settings = settings;
    this.initFirebase();
    if (this.db) {
      try {
        this.db.collection('platform_data').doc('settings').set({
          ...settings,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(() => {});
      } catch (e) {}
    }
  },

  purgeStudentData(studentId, accessCode) {
    if (!studentId && !accessCode) return;

    // 1. Remove specific localStorage db keys
    if (studentId) {
      localStorage.removeItem('alqimmah_db_' + studentId);
    }
    if (accessCode) {
      localStorage.removeItem('alqimmah_db_' + accessCode);
    }

    // 2. Scan and remove any stray matching localStorage keys
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('alqimmah_db_')) {
          if ((studentId && k.includes(studentId)) || (accessCode && k.includes(accessCode))) {
            keysToRemove.push(k);
          }
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {}

    // 3. Remove student attempts from shared/fallback DB if present
    try {
      const shared = localStorage.getItem(this.storageDbKey);
      if (shared) {
        const parsed = JSON.parse(shared);
        if (Array.isArray(parsed.examAttempts)) {
          parsed.examAttempts = parsed.examAttempts.filter(a => a.studentId !== studentId && a.accessCode !== accessCode);
        }
        if (Array.isArray(parsed.skillAttempts)) {
          parsed.skillAttempts = parsed.skillAttempts.filter(a => a.studentId !== studentId && a.accessCode !== accessCode);
        }
        if (Array.isArray(parsed.mistakesVault)) {
          parsed.mistakesVault = parsed.mistakesVault.filter(m => m.studentId !== studentId);
        }
        localStorage.setItem(this.storageDbKey, JSON.stringify(parsed));
      }
    } catch (e) {}

    // 4. If current logged in user is this student, clear auth immediately
    const user = this.getUser();
    if (user && ((studentId && user.id === studentId) || (accessCode && user.accessCode === accessCode))) {
      this.clearAuth();
    }
  },

  async syncCurrentStudentFromCloud() {
    if (!this.db) return;
    try {
      const user = this.getUser();
      if (user && user.role === 'student' && user.accessCode) {
        const docRef = this.db.collection('students').doc(user.accessCode);
        const doc = await docRef.get();
        if (doc.exists) {
          this.hydrateStudentProgressFromCloud(doc.data());
        }
      }
    } catch (e) {
      console.warn('[Firestore] Sync student error:', e);
    }
  },

  hydrateStudentProgressFromCloud(studentData) {
    if (!studentData) return;
    const cloudExamAttempts = Array.isArray(studentData.examAttempts) ? studentData.examAttempts : [];
    const cloudSkillAttempts = Array.isArray(studentData.skillAttempts) ? studentData.skillAttempts : [];
    const cloudMistakes = Array.isArray(studentData.mistakesVault) ? studentData.mistakesVault : [];

    const ldb = this.getLocalDb();

    let hasNew = false;
    // Merge exam attempts
    cloudExamAttempts.forEach(ca => {
      if (!ldb.examAttempts.some(la => la.id === ca.id || (la.examId === ca.examId && la.submittedAt === ca.submittedAt))) {
        ldb.examAttempts.push(ca);
        hasNew = true;
      }
    });

    // Merge skill attempts
    cloudSkillAttempts.forEach(ca => {
      if (!ldb.skillAttempts.some(la => la.id === ca.id || (la.testId === ca.testId && la.submittedAt === ca.submittedAt))) {
        ldb.skillAttempts.push(ca);
        hasNew = true;
      }
    });

    // Merge mistakes
    cloudMistakes.forEach(cm => {
      if (!ldb.mistakesVault.some(lm => lm.id === cm.id)) {
        ldb.mistakesVault.push(cm);
        hasNew = true;
      }
    });

    if (hasNew || ldb.examAttempts.length > 0 || ldb.skillAttempts.length > 0) {
      this.saveLocalDb(ldb);
    }
  },

  getLocalDb() {
    const user = this.getUser();
    const studentId = (user && user.role === 'student' && user.id) ? user.id : null;
    const accessCode = (user && user.role === 'student' && user.accessCode) ? user.accessCode : null;

    let examAttempts = [];
    let skillAttempts = [];
    let mistakesVault = [];

    const tryKeys = [];
    if (studentId) tryKeys.push('alqimmah_db_' + studentId);
    if (accessCode && accessCode !== studentId) tryKeys.push('alqimmah_db_' + accessCode);
    tryKeys.push(this.storageDbKey);

    for (const key of tryKeys) {
      try {
        const s = localStorage.getItem(key);
        if (s) {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed.examAttempts)) {
            parsed.examAttempts.forEach(a => {
              if (!examAttempts.some(ex => ex.id === a.id || (ex.examId === a.examId && ex.submittedAt === a.submittedAt))) {
                examAttempts.push(a);
              }
            });
          }
          if (Array.isArray(parsed.skillAttempts)) {
            parsed.skillAttempts.forEach(a => {
              if (!skillAttempts.some(sk => sk.id === a.id || (sk.testId === a.testId && sk.submittedAt === a.submittedAt))) {
                skillAttempts.push(a);
              }
            });
          }
          if (Array.isArray(parsed.mistakesVault)) {
            parsed.mistakesVault.forEach(m => {
              if (!mistakesVault.some(mv => mv.id === m.id)) {
                mistakesVault.push(m);
              }
            });
          }
        }
      } catch (e) {}
    }

    return {
      examAttempts,
      skillAttempts,
      mistakesVault
    };
  },

  saveLocalDb(db) {
    const user = this.getUser();
    const studentId = (user && user.role === 'student' && user.id) ? user.id : null;
    const accessCode = (user && user.role === 'student' && user.accessCode) ? user.accessCode : null;
    const json = JSON.stringify(db);
    
    if (studentId) localStorage.setItem('alqimmah_db_' + studentId, json);
    if (accessCode) localStorage.setItem('alqimmah_db_' + accessCode, json);
    localStorage.setItem(this.storageDbKey, json);
  },

  getAllStudentsDb() {
    const combined = {
      examAttempts: [],
      skillAttempts: [],
      mistakesVault: []
    };

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('alqimmah_db_') || k === this.storageDbKey)) {
          try {
            const data = JSON.parse(localStorage.getItem(k));
            if (data) {
              if (Array.isArray(data.examAttempts)) combined.examAttempts.push(...data.examAttempts);
              if (Array.isArray(data.skillAttempts)) combined.skillAttempts.push(...data.skillAttempts);
              if (Array.isArray(data.mistakesVault)) combined.mistakesVault.push(...data.mistakesVault);
            }
          } catch(e) {}
        }
      }
    } catch(e) {}

    return combined;
  },

  async request(endpoint, options = {}) {
    const isFile = window.location.protocol === 'file:';
    const user = this.getUser() || {};
    const isAdmin = user.role === 'admin';

    // If not file protocol, attempt real backend server request first with a short timeout
    if (!isFile) {
      const url = '/api' + endpoint;
      const headers = options.headers || {};
      const token = this.getToken();
      if (token) headers['Authorization'] = 'Bearer ' + token;
      if (!(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout for static hosts
        const response = await fetch(url, { ...options, headers, signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await response.json();
            return data;
          }
        }
      } catch (err) {
        // Fallback to standalone handler below
      }
    }

    // Complete client-side handler using bundled questions
    // Admins have full access; students can only read their own data
    if (!isAdmin && endpoint.startsWith('/admin/')) {
      return {
        success: false,
        message: 'غير مصرح لك بالوصول لواجهة الإدارة.'
      };
    }

    return await this.handleClientFallback(endpoint, options);
  },

  async handleClientFallback(endpoint, options = {}) {
    const bundle = this.getBundle();
    const ldb = this.getLocalDb();
    const body = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};

    // 1. Auth: Code Login
    if (endpoint === '/auth/code-login' || endpoint === '/auth/student-login') {
      const code = (body.accessCode || '').trim().replace(/\s+/g, '').toUpperCase();
      const stripped = code.replace(/-/g, '');

      // Explicitly block all old or revoked admin codes
      const revokedCodes = ['AA1482010FGFG', 'QIMMAH-ADMIN-2026', 'ADMIN777', 'ADMIN-777'];
      if (revokedCodes.includes(code) || revokedCodes.includes(stripped)) {
        return {
          success: false,
          message: 'تم إلغاء صلاحية هذا الكود القديم نهائياً ولا يمكن استخدامه.'
        };
      }

      // Cryptographically verify admin code without storing plaintext password in client JS
      const adminSalt = 'Qimmah_Salt_2026_Secure_Gaber';
      const adminExpectedHash = 'da89de201b2e962fbeceee50a41caff71eeab3ca281fdb16b40e2efaa23336f8';
      const isAdmin = (this.sha256(adminSalt + code) === adminExpectedHash) ||
                      (this.sha256(adminSalt + stripped) === adminExpectedHash);

      if (isAdmin) {
        const adminUser = {
          id: 'user-admin-1',
          name: 'الأستاذ جابر القاضي',
          role: 'admin',
          email: 'admin@alqimmah.com',
          adminSecretVersion: 'v2026_da89de201b2e962f'
        };
        const token = 'standalone-token-admin-' + Date.now();
        return {
          success: true,
          role: 'admin',
          message: 'مرحباً بك أستاذ جابر، تم فتح لوحة الإدارة والتحكم.',
          token,
          user: adminUser
        };
      }

      // 1. Attempt Firestore live lookup first
      this.initFirebase();
      let student = null;
      let studentsList = this.getStudentsList();

      if (this.db) {
        try {
          // Direct lookup by document ID (which is code)
          const docDirect = await this.db.collection('students').doc(code).get();
          if (docDirect.exists) {
            student = { id: docDirect.id, ...docDirect.data() };
          } else {
            // Query by accessCode field
            const qSnap = await this.db.collection('students').where('accessCode', '==', code).limit(1).get();
            if (!qSnap.empty) {
              const d = qSnap.docs[0];
              student = { id: d.id, ...d.data() };
            } else {
              // Try stripped code match across all docs
              const allDocs = await this.db.collection('students').get();
              allDocs.forEach(d => {
                const sData = d.data();
                const sc = (sData.accessCode || d.id || '').trim().replace(/\s+/g, '').toUpperCase();
                if (sc === code || sc.replace(/-/g, '') === stripped) {
                  student = { id: d.id, ...sData };
                }
              });
            }
          }
        } catch (err) {
          console.warn('[Firestore] Code login query fallback to local:', err);
        }
      }

      // 2. Fallback to local persistent official students list
      if (!student) {
        student = studentsList.find(s => {
          const sCode = (s.accessCode || '').trim().replace(/\s+/g, '').toUpperCase();
          return sCode === code || sCode.replace(/-/g, '') === stripped;
        });
      } else {
        // Sync retrieved student into local cache
        const localIdx = studentsList.findIndex(s => s.id === student.id || s.accessCode === student.accessCode);
        if (localIdx !== -1) studentsList[localIdx] = student;
        else studentsList.unshift(student);
        this.saveStudentsList(studentsList);
      }

      if (student) {
        if (student.isActive === false) {
          return {
            success: false,
            message: 'تم تعطيل هذا الكود مؤقتاً. يرجى التواصل مع الأستاذ جابر القاضي لتفعيل الحساب.'
          };
        }
        const token = 'standalone-token-student-' + Date.now();
        student.lastLogin = new Date().toISOString();
        this.saveStudentsList(studentsList);

        // Hydrate attempts from cloud to local device storage!
        this.hydrateStudentProgressFromCloud(student);

        if (this.db && student.accessCode) {
          try {
            this.db.collection('students').doc(student.accessCode).set({
              lastLogin: student.lastLogin,
              lastActiveAt: student.lastLogin
            }, { merge: true }).catch(() => {});
          } catch(e) {}
        }
        return {
          success: true,
          role: 'student',
          message: 'أهلاً بك يا بطل! تم التحقق من كود الدخول بنجاح.',
          token,
          user: {
            id: student.id,
            name: student.name,
            role: 'student',
            accessCode: student.accessCode
          }
        };
      }

      // --- NO FALLBACK: code must be an officially generated student code from the admin panel ---
      // If we reach here, the code is not admin and not in the official students list
      return {
        success: false,
        message: 'كود الدخول غير صحيح أو غير مسجل. تواصل مع الأستاذ جابر القاضي للحصول على الكود.'
      };
    }

    // 2. Health check
    if (endpoint === '/health') {
      return { status: 'online', platform: 'منصة القمة في القدرات اللفظية', version: '1.0.0' };
    }

    // 3. User Me Profile
    if (endpoint === '/auth/me') {
      const user = this.getUser() || { id: 'std-105', name: 'طالب القمة', role: 'student', accessCode: 'QIMMAH-105' };
      return {
        success: true,
        user,
        stats: {
          completedExamsCount: ldb.examAttempts.length,
          averageScorePercent: ldb.examAttempts.length > 0
            ? Math.round(ldb.examAttempts.reduce((acc, cur) => acc + (cur.scorePercent || 0), 0) / ldb.examAttempts.length)
            : 0
        }
      };
    }

    // 4. Skills Overview List
    if (endpoint === '/skills') {
      const st = this.getSkillsTests();
      const skills = (st.skills || []).map(skill => {
        const skillAttempts = (ldb.skillAttempts || []).filter(a => a.skillId === skill.id);
        const completedTestIds = new Set(skillAttempts.map(a => a.testId));

        let totalQ = 0;
        let totalC = 0;
        skillAttempts.forEach(a => {
          const answeredInAttempt = (typeof a.answeredQuestionsCount === 'number') 
            ? a.answeredQuestionsCount 
            : (typeof a.answeredCount === 'number')
            ? a.answeredCount
            : (a.answers ? Object.keys(a.answers).length : (a.totalQuestions || 20));
          totalQ += answeredInAttempt;
          totalC += a.correctCount || 0;
        });
        const accuracy = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;

        return {
          id: skill.id,
          name: skill.name,
          description: skill.description,
          icon: skill.icon || 'fa-brain',
          color: skill.color || '#10b981',
          totalTests: (skill.tests || []).length || 6,
          questionsPerTest: 20,
          completedTestsCount: completedTestIds.size,
          accuracyPercent: accuracy,
          isCompletedAll: (skill.tests || []).length > 0 && completedTestIds.size >= skill.tests.length
        };
      });

      return { success: true, skills };
    }

    // 5. Skill Detail (with its tests) -> GET /skills/:skillId
    const skillDetailMatch = endpoint.match(/^\/skills\/([a-zA-Z0-9_\-]+)$/);
    if (skillDetailMatch) {
      const skillId = skillDetailMatch[1];
      const st = this.getSkillsTests();
      const skill = (st.skills || []).find(s => s.id === skillId);

      if (!skill) return { success: false, message: 'المهارة غير موجودة.' };

      const skillAttempts = (ldb.skillAttempts || []).filter(a => a.skillId === skillId);
      const tests = (skill.tests || []).map(t => {
        const testAttempts = skillAttempts.filter(a => a.testId === t.id);
        const bestAttempt = testAttempts.sort((a, b) => b.scorePercent - a.scorePercent)[0];

        return {
          id: t.id,
          testNumber: t.testNumber,
          title: t.title,
          questionCount: t.questions ? t.questions.length : (t.questionCount || 20),
          passingScore: t.passingScore || 16,
          completed: !!bestAttempt,
          bestScore: bestAttempt ? bestAttempt.correctCount : null,
          bestPercent: bestAttempt ? bestAttempt.scorePercent : null,
          passed: bestAttempt ? bestAttempt.passed : false,
          attemptsCount: testAttempts.length
        };
      });

      return {
        success: true,
        skill: {
          id: skill.id,
          name: skill.name,
          description: skill.description,
          icon: skill.icon,
          color: skill.color,
          totalTests: tests.length,
          questionsPerTest: 20,
          tests
        }
      };
    }

    // 6. Start Skill Practice Test -> GET /skills/:skillId/tests/:testId/start
    const skillTestStartMatch = endpoint.match(/^\/skills\/([a-zA-Z0-9_\-]+)\/tests\/([a-zA-Z0-9_\-]+)\/start$/);
    if (skillTestStartMatch) {
      const skillId = skillTestStartMatch[1];
      const testId = skillTestStartMatch[2];
      const st = this.getSkillsTests();
      const skill = (st.skills || []).find(s => s.id === skillId);
      if (!skill) return { success: false, message: 'المهارة غير موجودة.' };
      const test = (skill.tests || []).find(t => t.id === testId);
      if (!test) return { success: false, message: 'الاختبار غير موجود.' };

      const safeQuestions = (test.questions || []).map(q => ({
        id: q.id,
        num: q.num,
        skill: q.skill,
        skillTitle: q.skillTitle || null,
        passage: q.passage || null,
        question: q.question,
        options: q.options,
        correct: q.correct,
        explanation: q.explanation || 'مراجعة المهارة والقاعدة اللفظية المطلوبة.',
        rule: q.rule || ''
      }));

      return {
        success: true,
        test: {
          id: test.id,
          testNumber: test.testNumber,
          title: test.title,
          skillId: skill.id,
          skillName: skill.name,
          questionCount: safeQuestions.length,
          passingScore: test.passingScore || 16
        },
        questions: safeQuestions
      };
    }

    // 7. Submit Skill Practice Test -> POST /skills/:skillId/tests/:testId/submit
    const skillTestSubmitMatch = endpoint.match(/^\/skills\/([a-zA-Z0-9_\-]+)\/tests\/([a-zA-Z0-9_\-]+)\/submit$/);
    if (skillTestSubmitMatch) {
      const skillId = skillTestSubmitMatch[1];
      const testId = skillTestSubmitMatch[2];
      const st = this.getSkillsTests();
      const skill = (st.skills || []).find(s => s.id === skillId);
      const test = skill ? (skill.tests || []).find(t => t.id === testId) : null;

      const userAnswers = body.studentAnswers || body.answers || {};
      const questions = test ? test.questions : [];
      let correctCount = 0;
      const mistakes = [];

      questions.forEach(q => {
        const chosen = userAnswers[q.id];
        const isMatch = this.checkAnswerCorrectness(chosen, q);
        if (isMatch) {
          correctCount++;
        } else {
          const mistakeObj = {
            id: q.id,
            question: q.question,
            options: q.options,
            userChoice: (chosen !== undefined && chosen !== null) ? chosen : null,
            correctAnswer: q.correct || q.correctAnswer || 'أ',
            explanation: q.explanation || 'مراجعة المهارة والقاعدة اللفظية المطلوبة.',
            rule: q.rule || '',
            skill: skillId
          };
          mistakes.push(mistakeObj);
        }
      });

      const total = questions.length || 20;
      const scorePct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
      const passed = scorePct >= 80;
      const user = this.getUser();

      const answeredKeys = Object.keys(userAnswers).filter(k => userAnswers[k] !== undefined && userAnswers[k] !== null && userAnswers[k] !== '');
      const answeredCount = answeredKeys.length;

      const newSkillAttempt = {
        id: 'att-sk-' + Date.now(),
        studentId: user ? user.id : 'std-105',
        accessCode: user ? user.accessCode : null,
        skillId,
        testId,
        testTitle: test ? test.title : 'اختبار تدريبي',
        skillName: skill ? skill.name : 'المهارة',
        correctCount,
        answeredCount,
        answeredQuestionsCount: answeredCount,
        totalQuestions: total,
        scorePercent: scorePct,
        passed,
        submittedAt: new Date().toISOString(),
        answers: userAnswers
      };
      ldb.skillAttempts.push(newSkillAttempt);
      this.saveLocalDb(ldb);

      // Cloud Firestore Persistence
      this.initFirebase();
      if (this.db && user && user.accessCode) {
        try {
          const docRef = this.db.collection('students').doc(user.accessCode);
          docRef.set({
            lastActiveAt: new Date().toISOString(),
            skillAttempts: firebase.firestore.FieldValue.arrayUnion(newSkillAttempt)
          }, { merge: true }).catch(() => {});
        } catch (e) {}
      }

      return {
        success: true,
        attempt: {
          testId,
          testTitle: test ? test.title : 'اختبار تدريبي',
          skillName: skill ? skill.name : 'المهارة',
          scorePercent: scorePct,
          correctCount,
          totalQuestions: total,
          passed,
          durationSeconds: body.durationSeconds || 0,
          mistakes
        },
        breakdown: questions.map((q, idx) => {
          const chosen = userAnswers[q.id];
          const isCorrect = this.checkAnswerCorrectness(chosen, q);
          return {
            num: idx + 1,
            question: q.question,
            passage: q.passage,
            options: q.options,
            studentChoice: (chosen !== undefined && chosen !== null) ? chosen : null,
            correctChoice: q.correct || q.correctAnswer || 'أ',
            isCorrect,
            explanation: q.explanation || 'مراجعة المهارة والقاعدة اللفظية المطلوبة.',
            rule: q.rule || ''
          };
        })
      };
    }

    // 8. Faris Aggregated Exams (25 Exams by 5 Levels) -> GET /exams
    if (endpoint === '/exams') {
      const levels = (bundle && bundle.farisLevels) ? bundle.farisLevels : [];
      const exams = this.getFarisExams();
      const user = this.getUser();
      const studentAttempts = (ldb.examAttempts || []).filter(a => user && a.studentId === user.id);

      const mappedLevels = levels.map(lvl => {
        const examsInLevel = exams.filter(e => e.level === lvl.level).map(e => {
          const attempts = studentAttempts.filter(a => a.examId === e.id);
          const best = attempts.sort((a, b) => b.scorePercent - a.scorePercent)[0];
          return {
            id: e.id,
            examNumber: e.examNumber,
            title: e.title,
            level: e.level,
            levelTitle: e.levelTitle,
            questionCount: e.questionCount || (e.questions ? e.questions.length : 65),
            durationMinutes: e.durationMinutes || 60,
            passingScorePercent: e.passingScorePercent || 65,
            completed: !!best,
            bestScorePercent: best ? best.scorePercent : null,
            passed: best ? best.passed : false,
            attemptsCount: attempts.length
          };
        });
        return {
          ...lvl,
          isUnlocked: true,
          exams: examsInLevel
        };
      });

      return { success: true, levels: mappedLevels, totalExams: exams.length };
    }

    // 9. Start Faris Exam -> GET /exams/:examId/start
    const examStartMatch = endpoint.match(/^\/exams\/([a-zA-Z0-9_\-]+)\/start$/);
    if (examStartMatch) {
      const examId = examStartMatch[1];
      const exams = this.getFarisExams();
      const exam = exams.find(e => e.id === examId || e.id === 'faris-' + examId || e.examNumber === parseInt(examId, 10));

      if (!exam) return { success: false, message: 'الاختبار غير موجود.' };

      const safeQuestions = (exam.questions || []).map(q => ({
        id: q.id,
        num: q.num,
        skill: q.skill,
        skillTitle: q.skillTitle || null,
        passage: q.passage || null,
        question: q.question,
        options: q.options,
        correct: q.correct,
        explanation: q.explanation || 'مراجعة المهارة والقاعدة اللفظية المطلوبة.',
        rule: q.rule || ''
      }));

      return {
        success: true,
        exam: {
          id: exam.id,
          examNumber: exam.examNumber,
          title: exam.title,
          level: exam.level,
          levelTitle: exam.levelTitle,
          durationMinutes: exam.durationMinutes || 60,
          passingScorePercent: exam.passingScorePercent || 65,
          questionCount: safeQuestions.length
        },
        questions: safeQuestions
      };
    }

    // 10. Submit Faris Exam -> POST /exams/:examId/submit
    const examSubmitMatch = endpoint.match(/^\/exams\/([a-zA-Z0-9_\-]+)\/submit$/);
    if (examSubmitMatch) {
      const examId = examSubmitMatch[1];
      const exams = this.getFarisExams();
      const exam = exams.find(e => e.id === examId || e.id === 'faris-' + examId);
      if (!exam) return { success: false, message: 'الاختبار غير موجود.' };

      const userAnswers = body.studentAnswers || body.answers || {};
      const questions = exam.questions || [];
      let correctCount = 0;
      const mistakes = [];

      questions.forEach(q => {
        const chosen = userAnswers[q.id];
        const isMatch = this.checkAnswerCorrectness(chosen, q);
        if (isMatch) {
          correctCount++;
        } else {
          const mistakeObj = {
            id: q.id,
            question: q.question,
            options: q.options,
            userChoice: (chosen !== undefined && chosen !== null) ? chosen : null,
            correctAnswer: q.correct || q.correctAnswer || 'أ',
            explanation: q.explanation || 'مراجعة المهارة والقاعدة المطلوبة.',
            rule: q.rule || '',
            skill: q.skill || 'faris'
          };
          mistakes.push(mistakeObj);
        }
      });

      const total = questions.length || 65;
      const scorePct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
      const passThreshold = exam.passingScorePercent || 65;
      const passed = scorePct >= passThreshold;
      const user = this.getUser();

      const answeredKeys = Object.keys(userAnswers).filter(k => userAnswers[k] !== undefined && userAnswers[k] !== null && userAnswers[k] !== '');
      const answeredCount = answeredKeys.length;

      const newExamAttempt = {
        id: 'att-ex-' + Date.now(),
        studentId: user ? user.id : 'std-105',
        accessCode: user ? user.accessCode : null,
        examId: exam.id,
        examTitle: exam.title,
        scorePercent: scorePct,
        correctAnswersCount: correctCount,
        answeredCount,
        answeredQuestionsCount: answeredCount,
        totalQuestions: total,
        passed,
        submittedAt: new Date().toISOString(),
        answers: userAnswers
      };

      ldb.examAttempts.push(newExamAttempt);
      this.saveLocalDb(ldb);

      // Cloud Firestore Persistence for Exam Attempts
      this.initFirebase();
      if (this.db && user && user.accessCode) {
        try {
          const docRef = this.db.collection('students').doc(user.accessCode);
          docRef.set({
            lastActiveAt: new Date().toISOString(),
            examAttempts: firebase.firestore.FieldValue.arrayUnion(newExamAttempt)
          }, { merge: true }).catch(() => {});
        } catch (e) {}
      }

      return {
        success: true,
        results: {
          examId: exam.id,
          examTitle: exam.title,
          title: exam.title,
          scorePercent: scorePct,
          correctCount,
          correctAnswersCount: correctCount,
          totalQuestions: total,
          passed,
          passingScorePercent: passThreshold,
          passingThreshold: passThreshold,
          durationSeconds: body.durationSeconds || 0,
          mistakes,
          breakdown: questions.map((q, idx) => {
            const chosen = userAnswers[q.id];
            const isMatch = this.checkAnswerCorrectness(chosen, q);
            return {
              num: idx + 1,
              question: q.question,
              passage: q.passage,
              options: q.options,
              studentChoice: (chosen !== undefined && chosen !== null) ? chosen : null,
              correctChoice: q.correct || q.correctAnswer || 'أ',
              isCorrect: isMatch,
              explanation: q.explanation || 'مراجعة المهارة والقاعدة المطلوبة.',
              rule: q.rule || ''
            };
          })
        }
      };
    }

    // 11. Student Next Step -> GET /students/next-step
    if (endpoint === '/students/next-step') {
      const attempts = ldb.examAttempts || [];
      const completedIds = new Set(attempts.map(a => a.examId));
      let nextExamNum = 1;
      for (let i = 1; i <= 25; i++) {
        if (!completedIds.has(`faris-${i}`)) {
          nextExamNum = i;
          break;
        }
      }
      return {
        success: true,
        nextStep: {
          type: 'exam',
          title: `انطلق مع النموذج ${nextExamNum} من الاختبارات المجمعة`,
          subtitle: `تابع مسيرتك نحو الـ 100% بحل النموذج رقم ${nextExamNum} ومحاكاة بيئة قياس الحقيقية.`,
          actionText: `ابدأ النموذج ${nextExamNum} ←`,
          actionTarget: `faris-${nextExamNum}`,
          badge: 'الخطوة التالية',
          badgeColor: 'emerald',
          icon: 'fa-rocket'
        }
      };
    }

    // 12. Student Streak -> GET /students/streak
    if (endpoint === '/students/streak') {
      return {
        success: true,
        currentStreak: 3,
        weekDays: [
          { dayName: 'السبت', active: true, isToday: false },
          { dayName: 'الأحد', active: true, isToday: false },
          { dayName: 'الإثنين', active: true, isToday: false },
          { dayName: 'الثلاثاء', active: false, isToday: true },
          { dayName: 'الأربعاء', active: false, isToday: false },
          { dayName: 'الخميس', active: false, isToday: false },
          { dayName: 'الجمعة', active: false, isToday: false }
        ]
      };
    }

    // 13. Student Mistakes Vault -> GET /students/mistakes (Cleaned / Deprecated)
    if (endpoint === '/students/mistakes') {
      return {
        success: true,
        mistakes: []
      };
    }

    // 13b. Resolve Mistake -> POST /students/mistakes/resolve
    if (endpoint === '/students/mistakes/resolve') {
      return { success: true, message: 'تم بنجاح' };
    }

    // 14. Student Achievements -> GET /students/achievements
    if (endpoint === '/students/achievements') {
      const st = (bundle && bundle.skillsTests) ? bundle.skillsTests : { skills: [] };
      const skillAttempts = ldb.skillAttempts || [];
      const examAttempts = ldb.examAttempts || [];
      

      // Skills summary
      const skillsSummary = (st.skills || []).map(skill => {
        const attempts = skillAttempts.filter(a => a.skillId === skill.id);
        const uniqueTests = new Set(attempts.map(a => a.testId));
        let best = 0;
        let totalP = 0;
        attempts.forEach(a => {
          if ((a.correctCount || 0) > best) best = a.correctCount;
          totalP += (a.scorePercent || 0);
        });
        const avg = attempts.length > 0 ? Math.round(totalP / attempts.length) : 0;
        return {
          skillId: skill.id,
          name: skill.name,
          icon: skill.icon || 'fa-brain',
          color: skill.color || '#10b981',
          totalTests: (skill.tests || []).length || 6,
          completedTestsCount: uniqueTests.size,
          bestScore: best,
          averagePercent: avg,
          attemptsCount: attempts.length
        };
      });

      // Overall calculations
      let totalSkillQ = 0, totalSkillC = 0;
      skillAttempts.forEach(a => { 
        let answeredInAttempt = (typeof a.answeredQuestionsCount === 'number') 
          ? a.answeredQuestionsCount 
          : (typeof a.answeredCount === 'number')
          ? a.answeredCount
          : (a.answers ? Object.keys(a.answers).length : null);
        if (answeredInAttempt === null) {
          answeredInAttempt = a.totalQuestions || 20;
        }
        totalSkillQ += answeredInAttempt; 
        totalSkillC += (a.correctCount || 0); 
      });

      let totalExamQ = 0, totalExamC = 0;
      examAttempts.forEach(a => { 
        let answeredInAttempt = (typeof a.answeredQuestionsCount === 'number') 
          ? a.answeredQuestionsCount 
          : (typeof a.answeredCount === 'number')
          ? a.answeredCount
          : (a.answers ? Object.keys(a.answers).length : null);
        if (answeredInAttempt === null) {
          answeredInAttempt = a.totalQuestions || 65;
        }
        totalExamQ += answeredInAttempt; 
        totalExamC += (a.correctAnswersCount || a.correctCount || 0); 
      });

      const totalQ = totalSkillQ + totalExamQ;
      const totalC = totalSkillC + totalExamC;
      const overallAcc = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;

      return {
        success: true,
        overall: {
          completedSkillTestsCount: new Set(skillAttempts.map(a => a.testId)).size,
          totalSkillAttemptsCount: skillAttempts.length,
          completedExamsCount: new Set(examAttempts.map(a => a.examId)).size,
          totalExamAttemptsCount: examAttempts.length,
          totalQuestionsAnswered: totalQ,
          totalCorrectAnswers: totalC,
          overallAccuracyPercent: overallAcc,
                  },
        skillsSummary,
        recentSkillAttempts: skillAttempts.slice(0, 30),
        recentExamAttempts: examAttempts.slice(0, 30),
              };
    }

    // 16. Admin Metrics -> GET /admin/metrics
    if (endpoint === '/admin/metrics') {
      const allData = this.getAllStudentsDb();
      const students = (bundle && bundle.users) ? bundle.users.filter(u => u.role === 'student') : [];
      const activeStudents = students.filter(s => s.isActive !== false);
      const attempts = allData.examAttempts || [];
      const totalAttempts = attempts.length;
      const passed = attempts.filter(a => a.passed).length;
      const passRate = totalAttempts > 0 ? Math.round((passed / totalAttempts) * 100) : 0;
      const avgScore = totalAttempts > 0 ? Math.round(attempts.reduce((a, b) => a + (b.scorePercent || 0), 0) / totalAttempts) : 0;

      return {
        success: true,
        metrics: {
          totalStudents: students.length,
          activeStudents: activeStudents.length,
          disabledStudents: students.length - activeStudents.length,
          totalAttempts,
          passRate,
          averageScore: avgScore,
          activeToday: activeStudents.length,
                  }
      };
    }

    // 17. Admin Exams List -> GET /admin/exams-list
    if (endpoint === '/admin/exams-list') {
      const exams = (bundle && bundle.farisExams) ? bundle.farisExams : [];
      return {
        success: true,
        exams: exams.map(e => ({
          id: e.id,
          examNumber: e.examNumber,
          title: e.title,
          levelTitle: e.levelTitle || 'المستوى العام',
          questionCount: e.questionCount || (e.questions ? e.questions.length : 65),
          durationMinutes: e.durationMinutes || 60,
          passingScorePercent: e.passingScorePercent || 65
        }))
      };
    }

    // 18. Admin Students Operations
    // 18a. Add Student -> POST /admin/students
    if (endpoint === '/admin/students' && options.method === 'POST') {
      const name = (body.name || 'طالب جديد').trim();
      const customCode = body.accessCode;
      const code = customCode && customCode.trim() ? customCode.trim().toUpperCase() : ('QIMMAH-' + Math.floor(100 + Math.random() * 900));
      
      const studentsList = this.getStudentsList();
      
      // Ensure unique ID
      const newId = 'std-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      
      // Purge any accidental leftover storage for this ID or Code so student starts 100% fresh
      this.purgeStudentData(newId, code);

      const newStd = {
        id: newId,
        name,
        accessCode: code,
        role: 'student',
        isActive: true,
        createdAt: new Date().toISOString()
      };

      studentsList.unshift(newStd);
      this.saveStudentsList(studentsList);

      // Write to Firestore Cloud
      this.initFirebase();
      if (this.db) {
        try {
          await this.db.collection('students').doc(code).set({
            ...newStd,
            attempts: [],
            stats: { completedExams: 0, completedSkills: 0, averageScore: 0 }
          }, { merge: true });
        } catch (err) {
          console.warn('[Firestore] Student write error:', err);
        }
      }

      return {
        success: true,
        message: `تم إضافة الطالب بنجاح! كود الوصول: ${code}`,
        student: newStd
      };
    }

    // 18b. Edit Student -> PUT /admin/students/:id
    const putStudentMatch = endpoint.match(/^\/admin\/students\/([a-zA-Z0-9_\-]+)$/);
    if (putStudentMatch && options.method === 'PUT') {
      const id = putStudentMatch[1];
      const studentsList = this.getStudentsList();
      const std = studentsList.find(u => u.id === id);
      if (std) {
        if (body.name) std.name = body.name.trim();
        if (body.phone) std.phone = body.phone.trim();
        if (body.notes) std.notes = body.notes.trim();
        if (body.accessCode) std.accessCode = body.accessCode.trim().toUpperCase();
        this.saveStudentsList(studentsList);
        return { success: true, message: 'تم تحديث بيانات الطالب بنجاح', student: std };
      }
      return { success: false, message: 'الطالب غير موجود.' };
    }

    // 18c. Toggle Student Status -> PATCH /admin/students/:id/toggle-status
    const toggleMatch = endpoint.match(/^\/admin\/students\/([a-zA-Z0-9_\-]+)\/toggle-status$/);
    if (toggleMatch) {
      const id = toggleMatch[1];
      const studentsList = this.getStudentsList();
      const std = studentsList.find(u => u.id === id);
      if (std) {
        std.isActive = !std.isActive;
        this.saveStudentsList(studentsList);
        this.initFirebase();
        if (this.db && std.accessCode) {
          try {
            this.db.collection('students').doc(std.accessCode).set({
              isActive: std.isActive,
              updatedAt: new Date().toISOString()
            }, { merge: true }).catch(() => {});
          } catch (e) {}
        }
        return { success: true, message: std.isActive ? 'تم تفعيل حساب الطالب' : 'تم تعطيل حساب الطالب', isActive: std.isActive };
      }
      return { success: false, message: 'الطالب غير موجود' };
    }

    // 18d. Regenerate Code -> POST /admin/students/:id/regenerate-code
    const regenMatch = endpoint.match(/^\/admin\/students\/([a-zA-Z0-9_\-]+)\/regenerate-code$/);
    if (regenMatch) {
      const id = regenMatch[1];
      const studentsList = this.getStudentsList();
      const std = studentsList.find(u => u.id === id);
      const newCode = 'QIMMAH-' + Math.floor(100 + Math.random() * 900);
      if (std) {
        const oldCode = std.accessCode;
        std.accessCode = newCode;
        this.saveStudentsList(studentsList);
        this.initFirebase();
        if (this.db) {
          try {
            if (oldCode) await this.db.collection('students').doc(oldCode).delete();
            await this.db.collection('students').doc(newCode).set(std, { merge: true });
          } catch (e) {}
        }
        return { success: true, message: `تم توليد كود جديد: ${newCode}`, newAccessCode: newCode, accessCode: newCode };
      }
      return { success: false, message: 'الطالب غير موجود' };
    }

    // 18e. Delete Student -> DELETE /admin/students/:id
    // PURGES EVERYTHING: user record, local databases, attempt history, and active sessions!
    const delMatch = endpoint.match(/^\/admin\/students\/([a-zA-Z0-9_\-]+)$/);
    if (delMatch && options.method === 'DELETE') {
      const id = delMatch[1];
      let studentsList = this.getStudentsList();
      const targetStudent = studentsList.find(u => u.id === id);
      
      const targetCode = targetStudent ? targetStudent.accessCode : null;

      // 1. Purge all data associated with this student
      this.purgeStudentData(id, targetCode);

      // 2. Remove student from list and persist
      studentsList = studentsList.filter(u => u.id !== id);
      this.saveStudentsList(studentsList);

      // Delete from Firestore Cloud
      this.initFirebase();
      if (this.db && targetCode) {
        try {
          await this.db.collection('students').doc(targetCode).delete();
        } catch (e) {
          console.warn('[Firestore] Student delete warning:', e);
        }
      }

      return {
        success: true,
        message: 'تم حذف حساب الطالب وكافة سجلاته وبياناته نهائياً من الموقع.'
      };
    }

    // 18f. Bulk Status -> POST /admin/students/bulk-status
    if (endpoint === '/admin/students/bulk-status') {
      const ids = body.studentIds || [];
      const isActive = !!body.isActive;
      const studentsList = this.getStudentsList();
      studentsList.forEach(u => {
        if (ids.includes(u.id)) u.isActive = isActive;
      });
      this.saveStudentsList(studentsList);
      return { success: true, message: `تم تحديث حالة ${ids.length} طلاب بنجاح` };
    }

    // 18g. List Students -> GET /admin/students
    if (endpoint.startsWith('/admin/students')) {
      const allData = this.getAllStudentsDb();
      const students = this.getStudentsList();
      const mapped = students.map(s => {
        const attempts = (allData.examAttempts || []).filter(a => a.studentId === s.id);
        const comp = attempts.length;
        const avg = comp > 0 ? Math.round(attempts.reduce((a, b) => a + (b.scorePercent || 0), 0) / comp) : 0;
        const best = comp > 0 ? Math.max(...attempts.map(a => a.scorePercent || 0)) : 0;
        return {
          id: s.id,
          name: s.name,
          accessCode: s.accessCode,
          isActive: s.isActive !== false,
          createdAt: s.createdAt || '2026-10-23T00:00:00.000Z',
          lastLogin: s.lastLogin || null,
          examsCompleted: comp,
          passedExams: attempts.filter(a => a.passed).length,
          averageScore: avg,
          bestScore: best
        };
      });
      return {
        success: true,
        total: mapped.length,
        students: mapped
      };
    }

    // 19. Admin Skills Overview -> GET /admin/skills-overview
    if (endpoint === '/admin/skills-overview') {
      const st = this.getSkillsTests();
      const skills = (st.skills || []).map(s => {
        const tests = s.tests || [];
        const totalQuestions = tests.reduce((sum, t) => sum + (t.questions ? t.questions.length : (t.questionCount || 0)), 0);
        return {
          id: s.id,
          name: s.name,
          category: s.category || s.id,
          icon: s.icon || 'fa-brain',
          color: s.color || 'from-emerald-500 to-teal-700',
          testsCount: tests.length,
          questionsCount: totalQuestions
        };
      });
      return { success: true, skills };
    }

    // 20. Skill Tests List & Create -> GET, POST /admin/skills/:skillId/tests
    const adminSkillTestsMatch = endpoint.match(/^\/admin\/skills\/([a-zA-Z0-9_\-]+)\/tests$/);
    if (adminSkillTestsMatch) {
      const skillId = adminSkillTestsMatch[1];
      const st = this.getSkillsTests();
      const skill = (st.skills || []).find(s => s.id === skillId);
      if (!skill) return { success: false, message: 'المهارة غير موجودة.' };

      if (options.method === 'POST') {
        const tests = skill.tests || [];
        const nextNum = tests.length + 1;
        const newTest = {
          id: `${skillId}-test-${Date.now()}`,
          testNumber: nextNum,
          title: body.title || `الاختبار التدريبي (${nextNum})`,
          description: body.description || `تدريبات متخصصة في مهارة ${skill.name}`,
          passingScore: parseInt(body.passingScore || 16, 10),
          passingScorePercent: parseInt(body.passingScorePercent || 80, 10),
          questions: []
        };
        tests.push(newTest);
        skill.tests = tests;
        this.saveSkillsTests(st);
        return { success: true, message: 'تم إنشاء الاختبار التدريبي بنجاح.', test: newTest };
      }

      // GET
      const mapped = (skill.tests || []).map(t => ({
        id: t.id,
        testNumber: t.testNumber,
        title: t.title,
        description: t.description,
        questionCount: t.questions ? t.questions.length : (t.questionCount || 0),
        passingScore: t.passingScore || 16,
        passingScorePercent: t.passingScorePercent || 80
      }));
      return { success: true, skill: { id: skill.id, name: skill.name }, tests: mapped };
    }

    // 21. Skill Test Questions Reorder -> POST /admin/skills/:skillId/tests/:testId/questions/reorder
    const adminSkillQReorderMatch = endpoint.match(/^\/admin\/skills\/([a-zA-Z0-9_\-]+)\/tests\/([a-zA-Z0-9_\-]+)\/questions\/reorder$/);
    if (adminSkillQReorderMatch) {
      const skillId = adminSkillQReorderMatch[1];
      const testId = adminSkillQReorderMatch[2];
      const st = this.getSkillsTests();
      const skill = (st.skills || []).find(s => s.id === skillId);
      const test = skill ? (skill.tests || []).find(t => t.id === testId) : null;
      if (!test || !test.questions) return { success: false, message: 'الاختبار غير موجود.' };

      const { qId, direction } = body;
      const idx = test.questions.findIndex(q => q.id === qId);
      if (idx !== -1) {
        if (direction === 'up' && idx > 0) {
          const temp = test.questions[idx];
          test.questions[idx] = test.questions[idx - 1];
          test.questions[idx - 1] = temp;
        } else if (direction === 'down' && idx < test.questions.length - 1) {
          const temp = test.questions[idx];
          test.questions[idx] = test.questions[idx + 1];
          test.questions[idx + 1] = temp;
        }
        test.questions.forEach((q, i) => { q.num = i + 1; });
        this.saveSkillsTests(st);
        return { success: true, message: 'تم تغيير ترتيب السؤال بنجاح.', questions: test.questions };
      }
      return { success: false, message: 'السؤال غير موجود.' };
    }

    // 22. Skill Test Single Question Item -> GET, PUT, DELETE /admin/skills/:skillId/tests/:testId/questions/:qId
    const adminSkillQItemMatch = endpoint.match(/^\/admin\/skills\/([a-zA-Z0-9_\-]+)\/tests\/([a-zA-Z0-9_\-]+)\/questions\/([a-zA-Z0-9_\-]+)$/);
    if (adminSkillQItemMatch) {
      const skillId = adminSkillQItemMatch[1];
      const testId = adminSkillQItemMatch[2];
      const qId = adminSkillQItemMatch[3];
      const st = this.getSkillsTests();
      const skill = (st.skills || []).find(s => s.id === skillId);
      const test = skill ? (skill.tests || []).find(t => t.id === testId) : null;
      if (!test || !test.questions) return { success: false, message: 'الاختبار غير موجود.' };

      const qIdx = test.questions.findIndex(q => q.id === qId);
      if (qIdx === -1) return { success: false, message: 'السؤال غير موجود.' };

      if (options.method === 'DELETE') {
        test.questions.splice(qIdx, 1);
        test.questions.forEach((q, i) => { q.num = i + 1; });
        test.questionCount = test.questions.length;
        this.saveSkillsTests(st);
        return { success: true, message: 'تم حذف السؤال بنجاح.', remainingCount: test.questions.length };
      }

      if (options.method === 'PUT' || options.method === 'PATCH') {
        const q = test.questions[qIdx];
        if (body.question !== undefined) q.question = (body.question || '').trim();
        if (body.passage !== undefined) q.passage = (body.passage || '').trim() || null;
        if (body.options) q.options = body.options;
        if (body.correct !== undefined) q.correct = (body.correct || 'أ').trim();
        if (body.explanation !== undefined) q.explanation = (body.explanation || '').trim();
        if (body.rule !== undefined) q.rule = (body.rule || '').trim();
        this.saveSkillsTests(st);
        return { success: true, message: 'تم تحديث السؤال بنجاح.', question: q };
      }

      // GET
      return { success: true, question: test.questions[qIdx] };
    }

    // 23. Skill Test Questions List & Create -> GET, POST /admin/skills/:skillId/tests/:testId/questions
    const adminSkillQuestionsMatch = endpoint.match(/^\/admin\/skills\/([a-zA-Z0-9_\-]+)\/tests\/([a-zA-Z0-9_\-]+)\/questions$/);
    if (adminSkillQuestionsMatch) {
      const skillId = adminSkillQuestionsMatch[1];
      const testId = adminSkillQuestionsMatch[2];
      const st = this.getSkillsTests();
      const skill = (st.skills || []).find(s => s.id === skillId);
      if (!skill) return { success: false, message: 'المهارة غير موجودة.' };
      const test = (skill.tests || []).find(t => t.id === testId);
      if (!test) return { success: false, message: 'الاختبار غير موجود.' };

      if (!test.questions) test.questions = [];

      if (options.method === 'POST') {
        const qNum = test.questions.length + 1;
        const newQ = {
          id: `${testId}-q-${Date.now()}`,
          num: qNum,
          skill: skillId,
          skillTitle: skill.name,
          question: (body.question || '').trim(),
          passage: (body.passage || '').trim() || null,
          options: Array.isArray(body.options) ? body.options : [body.optionA || '', body.optionB || '', body.optionC || '', body.optionD || ''],
          correct: (body.correct || body.correctAnswer || 'أ').trim(),
          explanation: (body.explanation || '').trim() || 'مراجعة المهارة والقاعدة اللفظية المطلوبة.',
          rule: (body.rule || '').trim()
        };
        test.questions.push(newQ);
        test.questionCount = test.questions.length;
        this.saveSkillsTests(st);
        return { success: true, message: 'تمت إضافة السؤال بنجاح.', question: newQ };
      }

      // GET
      return {
        success: true,
        skill: { id: skill.id, name: skill.name },
        test: { id: test.id, title: test.title, questionCount: test.questions.length },
        questions: test.questions
      };
    }

    // 24. Skill Test Item: GET, PUT, DELETE -> /admin/skills/:skillId/tests/:testId
    const adminSkillTestItemMatch = endpoint.match(/^\/admin\/skills\/([a-zA-Z0-9_\-]+)\/tests\/([a-zA-Z0-9_\-]+)$/);
    if (adminSkillTestItemMatch) {
      const skillId = adminSkillTestItemMatch[1];
      const testId = adminSkillTestItemMatch[2];
      const st = this.getSkillsTests();
      const skill = (st.skills || []).find(s => s.id === skillId);
      if (!skill) return { success: false, message: 'المهارة غير موجودة.' };

      const testIdx = (skill.tests || []).findIndex(t => t.id === testId);
      if (testIdx === -1) return { success: false, message: 'الاختبار غير موجود.' };
      const test = skill.tests[testIdx];

      if (options.method === 'DELETE') {
        skill.tests.splice(testIdx, 1);
        skill.tests.forEach((t, i) => { t.testNumber = i + 1; });
        this.saveSkillsTests(st);
        return { success: true, message: 'تم حذف الاختبار التدريبي بنجاح.' };
      }

      if (options.method === 'PUT' || options.method === 'PATCH') {
        if (body.title) test.title = body.title;
        if (body.description !== undefined) test.description = body.description;
        if (body.passingScore !== undefined) test.passingScore = parseInt(body.passingScore, 10);
        if (body.passingScorePercent !== undefined) test.passingScorePercent = parseInt(body.passingScorePercent, 10);
        this.saveSkillsTests(st);
        return { success: true, message: 'تم تحديث بيانات الاختبار بنجاح.', test };
      }

      // GET
      return { success: true, skill: { id: skill.id, name: skill.name }, test };
    }

    // 25. Combined Exams List -> GET /admin/exams-list
    if (endpoint === '/admin/exams-list') {
      const exams = this.getFarisExams();
      const mapped = exams.map(e => ({
        id: e.id,
        examNumber: e.examNumber,
        title: e.title,
        level: e.level,
        levelTitle: e.levelTitle || `المستوى ${e.level}`,
        questionCount: e.questions ? e.questions.length : (e.questionCount || 0),
        durationMinutes: e.durationMinutes || 60,
        passingScorePercent: e.passingScorePercent || 65
      }));
      return { success: true, exams: mapped };
    }

    // 26. Combined Exam Create -> POST /admin/exams
    if (endpoint === '/admin/exams' && options.method === 'POST') {
      const exams = this.getFarisExams();
      const nextNum = exams.length > 0 ? Math.max(...exams.map(e => e.examNumber || 0)) + 1 : 1;
      const level = parseInt(body.level || 1, 10);
      const levelTitles = {
        1: 'المستوى الأول: التأسيس والتثبيت',
        2: 'المستوى الثاني: التوسع والتطبيق',
        3: 'المستوى الثالث: التحدي والمنافسة',
        4: 'المستوى الرابع: المحاكاة المتقدمة',
        5: 'المستوى الخامس: الماراثون والاحتراف'
      };
      const newExam = {
        id: `faris-${nextNum}-${Date.now()}`,
        examNumber: nextNum,
        title: body.title || `الاختبار المجمع (${nextNum})`,
        level: level,
        levelTitle: levelTitles[level] || `المستوى ${level}`,
        durationMinutes: parseInt(body.durationMinutes || 60, 10),
        passingScorePercent: parseInt(body.passingScorePercent || 65, 10),
        questionCount: 0,
        questions: []
      };
      exams.push(newExam);
      this.saveFarisExams(exams);
      return { success: true, message: 'تم إنشاء الاختبار المجمع بنجاح.', exam: newExam };
    }

    // 27. Combined Exam Settings -> PUT /admin/exams/:id/settings
    const examSettingMatch = endpoint.match(/^\/admin\/exams\/([a-zA-Z0-9_\-]+)\/settings$/);
    if (examSettingMatch) {
      const id = examSettingMatch[1];
      const exams = this.getFarisExams();
      const ex = exams.find(e => e.id === id || e.id === 'faris-' + id);
      if (ex) {
        if (body.title) ex.title = body.title;
        if (body.level) {
          ex.level = parseInt(body.level, 10);
          const levelTitles = {
            1: 'المستوى الأول: التأسيس والتثبيت',
            2: 'المستوى الثاني: التوسع والتطبيق',
            3: 'المستوى الثالث: التحدي والمنافسة',
            4: 'المستوى الرابع: المحاكاة المتقدمة',
            5: 'المستوى الخامس: الماراثون والاحتراف'
          };
          ex.levelTitle = levelTitles[ex.level] || `المستوى ${ex.level}`;
        }
        if (body.durationMinutes) ex.durationMinutes = parseInt(body.durationMinutes, 10);
        if (body.passingScorePercent) ex.passingScorePercent = parseInt(body.passingScorePercent, 10);
        this.saveFarisExams(exams);
        return { success: true, message: 'تم حفظ إعدادات الاختبار بنجاح', exam: ex };
      }
      return { success: false, message: 'الاختبار غير موجود.' };
    }

    // 28. Combined Exam Questions Reorder -> POST /admin/exams/:id/questions/reorder
    const adminExamQReorderMatch = endpoint.match(/^\/admin\/exams\/([a-zA-Z0-9_\-]+)\/questions\/reorder$/);
    if (adminExamQReorderMatch) {
      const id = adminExamQReorderMatch[1];
      const exams = this.getFarisExams();
      const exam = exams.find(e => e.id === id || e.id === 'faris-' + id);
      if (!exam || !exam.questions) return { success: false, message: 'الاختبار غير موجود.' };

      const { qId, direction } = body;
      const idx = exam.questions.findIndex(q => q.id === qId);
      if (idx !== -1) {
        if (direction === 'up' && idx > 0) {
          const temp = exam.questions[idx];
          exam.questions[idx] = exam.questions[idx - 1];
          exam.questions[idx - 1] = temp;
        } else if (direction === 'down' && idx < exam.questions.length - 1) {
          const temp = exam.questions[idx];
          exam.questions[idx] = exam.questions[idx + 1];
          exam.questions[idx + 1] = temp;
        }
        exam.questions.forEach((q, i) => { q.num = i + 1; });
        this.saveFarisExams(exams);
        return { success: true, message: 'تم تغيير ترتيب السؤال بنجاح.', questions: exam.questions };
      }
      return { success: false, message: 'السؤال غير موجود.' };
    }

    // 29. Combined Exam Question Single Item -> GET, PUT, DELETE /admin/exams/:id/questions/:qId
    const adminExamQItemMatch = endpoint.match(/^\/admin\/exams\/([a-zA-Z0-9_\-]+)\/questions\/([a-zA-Z0-9_\-]+)$/);
    if (adminExamQItemMatch) {
      const id = adminExamQItemMatch[1];
      const qId = adminExamQItemMatch[2];
      const exams = this.getFarisExams();
      const exam = exams.find(e => e.id === id || e.id === 'faris-' + id);
      if (!exam || !exam.questions) return { success: false, message: 'الاختبار غير موجود.' };

      const qIdx = exam.questions.findIndex(q => q.id === qId);
      if (qIdx === -1) return { success: false, message: 'السؤال غير موجود.' };

      if (options.method === 'DELETE') {
        exam.questions.splice(qIdx, 1);
        exam.questions.forEach((q, i) => { q.num = i + 1; });
        exam.questionCount = exam.questions.length;
        this.saveFarisExams(exams);
        return { success: true, message: 'تم حذف السؤال بنجاح.', remainingCount: exam.questions.length };
      }

      if (options.method === 'PUT' || options.method === 'PATCH') {
        const q = exam.questions[qIdx];
        if (body.question !== undefined) q.question = (body.question || '').trim();
        if (body.passage !== undefined) q.passage = (body.passage || '').trim() || null;
        if (body.options) q.options = body.options;
        if (body.correct !== undefined) q.correct = (body.correct || 'أ').trim();
        if (body.explanation !== undefined) q.explanation = (body.explanation || '').trim();
        if (body.rule !== undefined) q.rule = (body.rule || '').trim();
        if (body.skill) {
          q.skill = body.skill;
          const skillTitles = {
            analogy: 'التناظر اللفظي',
            completion: 'إكمال الجمل',
            context: 'الخطأ السياقي',
            reading: 'استيعاب المقروء',
            odd: 'المفردة الشاذة'
          };
          q.skillTitle = skillTitles[body.skill] || q.skillTitle;
        }
        this.saveFarisExams(exams);
        return { success: true, message: 'تم تحديث السؤال بنجاح.', question: q };
      }

      // GET
      return { success: true, question: exam.questions[qIdx] };
    }

    // 30. Combined Exam Questions List & Create -> GET, POST /admin/exams/:id/questions
    const adminExamQuestionsMatch = endpoint.match(/^\/admin\/exams\/([a-zA-Z0-9_\-]+)\/questions$/);
    if (adminExamQuestionsMatch) {
      const id = adminExamQuestionsMatch[1];
      const exams = this.getFarisExams();
      const exam = exams.find(e => e.id === id || e.id === 'faris-' + id);
      if (!exam) return { success: false, message: 'الاختبار غير موجود.' };
      if (!exam.questions) exam.questions = [];

      if (options.method === 'POST') {
        const qNum = exam.questions.length + 1;
        const skillTitles = {
          analogy: 'التناظر اللفظي',
          completion: 'إكمال الجمل',
          context: 'الخطأ السياقي',
          reading: 'استيعاب المقروء',
          odd: 'المفردة الشاذة'
        };
        const skillId = body.skill || 'analogy';
        const newQ = {
          id: `exam-${exam.examNumber || exam.id}-q-${Date.now()}`,
          num: qNum,
          skill: skillId,
          skillTitle: skillTitles[skillId] || body.skillTitle || 'مهارة لفظية',
          question: (body.question || '').trim(),
          passage: (body.passage || '').trim() || null,
          options: Array.isArray(body.options) ? body.options : [body.optionA || '', body.optionB || '', body.optionC || '', body.optionD || ''],
          correct: (body.correct || body.correctAnswer || 'أ').trim(),
          explanation: (body.explanation || '').trim() || 'مراجعة المهارة والقاعدة المطلوبة.',
          rule: (body.rule || '').trim()
        };
        exam.questions.push(newQ);
        exam.questionCount = exam.questions.length;
        this.saveFarisExams(exams);
        return { success: true, message: 'تمت إضافة السؤال بنجاح.', question: newQ };
      }

      // GET
      return {
        success: true,
        exam: {
          id: exam.id,
          examNumber: exam.examNumber,
          title: exam.title,
          level: exam.level,
          questionCount: exam.questions.length
        },
        questions: exam.questions
      };
    }

    // 31. Combined Exam Item Delete -> DELETE /admin/exams/:id
    const adminExamDeleteMatch = endpoint.match(/^\/admin\/exams\/([a-zA-Z0-9_\-]+)$/);
    if (adminExamDeleteMatch && options.method === 'DELETE') {
      const id = adminExamDeleteMatch[1];
      const exams = this.getFarisExams();
      const exIdx = exams.findIndex(e => e.id === id || e.id === 'faris-' + id);
      if (exIdx === -1) return { success: false, message: 'الاختبار غير موجود.' };
      exams.splice(exIdx, 1);
      this.saveFarisExams(exams);
      return { success: true, message: 'تم حذف الاختبار المجمع بنجاح.' };
    }

    // 32. Backup Export -> GET /admin/backup/export
    if (endpoint === '/admin/backup/export') {
      const bundle = this.getBundle() || {};
      const fullData = {
        users: this.getStudentsList(),
        settings: this.getPlatformSettings(),
        skillsBank: bundle.skillsBank || {},
        skillsTests: this.getSkillsTests(),
        farisLevels: bundle.farisLevels || [],
        farisExams: this.getFarisExams()
      };
      return {
        success: true,
        exportDate: new Date().toISOString(),
        data: fullData,
        backup: fullData,
        skillsTests: fullData.skillsTests,
        farisExams: fullData.farisExams
      };
    }

    // 33. Backup Restore -> POST /admin/backup/restore
    if (endpoint === '/admin/backup/restore' && options.method === 'POST') {
      const data = body.data || body.backup || body;
      if (data.farisExams && Array.isArray(data.farisExams)) this.saveFarisExams(data.farisExams);
      if (data.skillsTests && (Array.isArray(data.skillsTests.skills) || Array.isArray(data.skillsTests))) this.saveSkillsTests(data.skillsTests);
      if (data.users && Array.isArray(data.users)) this.saveStudentsList(data.users);
      if (data.settings) this.savePlatformSettings(data.settings);
      return {
        success: true,
        message: 'تمت استعادة قاعدة البيانات والنسخة الاحتياطية بنجاح.'
      };
    }

    // 34. Platform Settings -> GET, PUT /admin/settings
    if (endpoint === '/admin/settings') {
      if (options.method === 'PUT' || options.method === 'POST') {
        const current = this.getPlatformSettings();
        if (body.instructorName) current.instructorName = body.instructorName.trim();
        if (body.instructorPhone) current.instructorPhone = body.instructorPhone.trim();
        if (body.passingThresholdPercent) current.passingThresholdPercent = parseInt(body.passingThresholdPercent, 10);
        this.savePlatformSettings(current);
        return {
          success: true,
          message: 'تم حفظ وتحديث إعدادات المنصة بنجاح.',
          settings: current
        };
      }
      return {
        success: true,
        settings: this.getPlatformSettings()
      };
    }

    // 35. Reset Database -> POST /admin/reset-database
    if (endpoint === '/admin/reset-database') {
      try {
        localStorage.removeItem(this.customExamsKey);
        localStorage.removeItem(this.customSkillsKey);
        localStorage.removeItem(this.platformSettingsKey);
      } catch (e) {}
      return {
        success: true,
        message: 'تمت استعادة قاعدة البيانات الأصلية المعتمدة للمنصة بنجاح.'
      };
    }

    return { success: true, data: [] };
  },

  get(endpoint) { return this.request(endpoint, { method: 'GET' }); },
  post(endpoint, data) { return this.request(endpoint, { method: 'POST', body: JSON.stringify(data) }); },
  put(endpoint, data) { return this.request(endpoint, { method: 'PUT', body: JSON.stringify(data) }); },
  patch(endpoint, data) { return this.request(endpoint, { method: 'PATCH', body: JSON.stringify(data) }); },
  delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); }
};

if (typeof window !== 'undefined') {
  window.API = API;
  try {
    API.purgeLegacyCache();
  } catch (e) {}
}

