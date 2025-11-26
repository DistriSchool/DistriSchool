import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const failureRate = new Rate('failed_requests');
const BASE_URL = __ENV.BASE_URL || 'http://localhost/api';

export const options = {
    stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '30s', target: 0 },
    ],
    thresholds: {
        http_req_duration: ['p(95)<2000'],
        failed_requests: ['rate<0.1'],
    },
};

let authToken = '';

function register() {
    const payload = JSON.stringify({
        name: `user_${Date.now()}_${Math.random()}`,
        email: `test_${Date.now()}_${Math.random()}@gmail.com`,
        password: '12341234',
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const res = http.post(`${BASE_URL}/auth/register`, payload, params);

    const success = check(res, {
        'register status 200': (r) => r.status === 200 || r.status === 201,
    });

    failureRate.add(!success);
    return res;
}

function login() {
    const payload = JSON.stringify({
        email: 'test@gmail.com',
        password: '180512d678',
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const res = http.post(`${BASE_URL}/auth/login`, payload, params);

    const success = check(res, {
        'login status 200': (r) => r.status === 200,
    });

    failureRate.add(!success);

    if (success && res.json('token')) {
        authToken = res.json('token');
    }

    return res;
}

function verifyEmail(token) {
    const res = http.get(`${BASE_URL}/auth/verify-email?token=${token}`);

    const success = check(res, {
        'verify email status 200': (r) => r.status === 200,
    });

    failureRate.add(!success);
    return res;
}

function requestPasswordReset() {
    const payload = JSON.stringify({
        email: 'test4@gmail.com',
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const res = http.post(`${BASE_URL}/auth/request-password-reset`, payload, params);

    const success = check(res, {
        'password reset request status 200': (r) => r.status === 200,
    });

    failureRate.add(!success);
    return res;
}

function resetPassword(token) {
    const payload = JSON.stringify({
        token: token,
        newPassword: '12341234',
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const res = http.post(`${BASE_URL}/auth/reset-password`, payload, params);

    const success = check(res, {
        'reset password status 200': (r) => r.status === 200,
    });

    failureRate.add(!success);
    return res;
}

function refreshToken(refreshToken) {
    const payload = JSON.stringify({
        refreshToken: refreshToken,
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const res = http.post(`${BASE_URL}/auth/refresh-token`, payload, params);

    const success = check(res, {
        'refresh token status 200': (r) => r.status === 200,
    });

    failureRate.add(!success);
    return res;
}

function healthCheck() {
    const res = http.get(`${BASE_URL}/auth/health`);

    const success = check(res, {
        'health check status 200': (r) => r.status === 200,
    });

    failureRate.add(!success);
    return res;
}

function getMe(token) {
    const params = {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    };

    const res = http.get(`${BASE_URL}/auth/me`, params);

    const success = check(res, {
        'get me status 200': (r) => r.status === 200,
    });

    failureRate.add(!success);
    return res;
}

function listStudents(token) {
    const params = {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    };

    const res = http.get(`${BASE_URL}/students`, params);

    const success = check(res, {
        'list students status 200': (r) => r.status === 200,
    });

    failureRate.add(!success);
    return res;
}

function createStudent(token) {
    const payload = JSON.stringify({
        fullName: `Student ${Date.now()}`,
        dateOfBirth: '2002-08-12',
        cpf: `${Math.floor(Math.random() * 100000000000)}`,
        email: `student_${Date.now()}_${Math.random()}@gmail.com`,
        password: '12341234',
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    };

    const res = http.post(`${BASE_URL}/students`, payload, params);

    const success = check(res, {
        'create student status 200': (r) => r.status === 200 || r.status === 201,
    });

    failureRate.add(!success);
    return res;
}

function updateStudent(token, studentId) {
    const payload = JSON.stringify({
        fullName: `Updated Student ${Date.now()}`,
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    };

    const res = http.put(`${BASE_URL}/students/${studentId}`, payload, params);

    const success = check(res, {
        'update student status 200': (r) => r.status === 200,
    });

    failureRate.add(!success);
    return res;
}

function getStudent(token, studentId) {
    const params = {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    };

    const res = http.get(`${BASE_URL}/students/${studentId}`, params);

    const success = check(res, {
        'get student status 200': (r) => r.status === 200,
    });

    failureRate.add(!success);
    return res;
}

function deleteStudent(token, studentId) {
    const params = {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    };

    const res = http.del(`${BASE_URL}/students/${studentId}`, null, params);

    const success = check(res, {
        'delete student status 200': (r) => r.status === 200 || r.status === 204,
    });

    failureRate.add(!success);
    return res;
}

function listTeachers(token) {
    const params = {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    };

    const res = http.get(`${BASE_URL}/teachers`, params);

    const success = check(res, {
        'list teachers status 200': (r) => r.status === 200,
    });

    failureRate.add(!success);
    return res;
}

function createTeacher(token) {
    const payload = JSON.stringify({
        fullName: `Teacher ${Date.now()}`,
        dateOfBirth: '2002-08-12',
        cpf: `${Math.floor(Math.random() * 100000000000)}`,
        email: `teacher_${Date.now()}_${Math.random()}@gmail.com`,
        password: '12341234',
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    };

    const res = http.post(`${BASE_URL}/teachers`, payload, params);

    const success = check(res, {
        'create teacher status 200': (r) => r.status === 200 || r.status === 201,
    });

    failureRate.add(!success);
    return res;
}

export default function() {
    const scenario = Math.random();

    if (scenario < 0.1) {
        register();
        sleep(1);
    } else if (scenario < 0.3) {
        login();
        sleep(1);
    } else if (scenario < 0.4) {
        healthCheck();
        sleep(0.5);
    } else {
        if (!authToken) {
            login();
            sleep(1);
        }

        if (authToken) {
            const action = Math.random();

            if (action < 0.2) {
                getMe(authToken);
            } else if (action < 0.4) {
                listStudents(authToken);
            } else if (action < 0.5) {
                createStudent(authToken);
            } else if (action < 0.6) {
                getStudent(authToken, 6);
            } else if (action < 0.7) {
                updateStudent(authToken, 6);
            } else if (action < 0.8) {
                listTeachers(authToken);
            } else if (action < 0.9) {
                createTeacher(authToken);
            }

            sleep(1);
        }
    }
}
