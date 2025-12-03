import http from 'k6/http'
import { check, group, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const errorRate = new Rate('errors')
const studentCreationDuration = new Trend('student_creation_duration')
const teacherCreationDuration = new Trend('teacher_creation_duration')

export let options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '3m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '2m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<3000'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.05'],
    student_creation_duration: ['p(95)<1500'],
    teacher_creation_duration: ['p(95)<1500'],
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost'
const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || 'admin@distrischool.com'
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || 'admin123'

function randomCpf() {
  return Math.floor(Math.random() * 1e11).toString().padStart(11, '0')
}

function randomPhone() {
  return `11${Math.floor(Math.random() * 1e9).toString().padStart(9, '0')}`
}

function randomString(length = 8) {
  return Math.random().toString(36).substring(2, 2 + length)
}

export function setup() {
  const payload = JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  const params = { headers: { 'Content-Type': 'application/json' } }
  const res = http.post(`${BASE_URL}/api/auth/login`, payload, params)

  if (res.status !== 200) {
    throw new Error(`Setup failed: login returned ${res.status}`)
  }

  return { token: res.json('token') }
}

export default function(data) {
  const authHeaders = {
    headers: {
      Authorization: `Bearer ${data.token}`,
      'Content-Type': 'application/json',
    },
  }

  group('Auth flow', function() {
    const payload = JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    const params = { headers: { 'Content-Type': 'application/json' } }
    const res = http.post(`${BASE_URL}/api/auth/login`, payload, params)

    const loginSuccess = check(res, {
      'login status 200': r => r.status === 200,
      'has token': r => !!r.json('token'),
      'response time < 500ms': r => r.timings.duration < 500,
    })

    errorRate.add(!loginSuccess)
  })

  group('Students CRUD', function() {
    const listRes = http.get(`${BASE_URL}/api/students`, authHeaders)
    check(listRes, {
      'students list 200': r => r.status === 200,
      'students list has data': r => Array.isArray(r.json()),
    })

    const newStudent = {
      fullName: `Load Test Student ${randomString()}`,
      dateOfBirth: '2005-01-01',
      cpf: randomCpf(),
      email: `student-${randomString()}@example.com`,
      phone: randomPhone(),
      address: `Rua ${randomString()}, ${Math.floor(Math.random() * 1000)}`,
    }

    const createRes = http.post(`${BASE_URL}/api/students`, JSON.stringify(newStudent), authHeaders)
    studentCreationDuration.add(createRes.timings.duration)

    const createSuccess = check(createRes, {
      'create student success': r => r.status === 201 || r.status === 200,
      'student has id': r => !!r.json('id'),
    })

    errorRate.add(!createSuccess)

    if (createSuccess) {
      const studentId = createRes.json('id')

      const getRes = http.get(`${BASE_URL}/api/students/${studentId}`, authHeaders)
      check(getRes, {
        'get student 200': r => r.status === 200,
        'student data matches': r => r.json('email') === newStudent.email,
      })

      const updateData = {
        ...newStudent,
        fullName: `Updated ${newStudent.fullName}`,
      }

      const updateRes = http.put(`${BASE_URL}/api/students/${studentId}`, JSON.stringify(updateData), authHeaders)
      check(updateRes, {
        'update student success': r => r.status === 200 || r.status === 204,
      })

      const deleteRes = http.del(`${BASE_URL}/api/students/${studentId}`, null, authHeaders)
      check(deleteRes, {
        'delete student success': r => r.status === 200 || r.status === 204,
      })
    }
  })

  group('Teachers CRUD', function() {
    const listRes = http.get(`${BASE_URL}/api/teachers`, authHeaders)
    check(listRes, {
      'teachers list 200': r => r.status === 200,
      'teachers list has data': r => Array.isArray(r.json()),
    })

    const newTeacher = {
      fullName: `Load Test Teacher ${randomString()}`,
      dateOfBirth: '1985-06-15',
      cpf: randomCpf(),
      email: `teacher-${randomString()}@example.com`,
      phone: randomPhone(),
      specialization: ['Mathematics', 'Physics'][Math.floor(Math.random() * 2)],
    }

    const createRes = http.post(`${BASE_URL}/api/teachers`, JSON.stringify(newTeacher), authHeaders)
    teacherCreationDuration.add(createRes.timings.duration)

    const createSuccess = check(createRes, {
      'create teacher success': r => r.status === 201 || r.status === 200,
      'teacher has id': r => !!r.json('id'),
    })

    errorRate.add(!createSuccess)

    if (createSuccess) {
      const teacherId = createRes.json('id')

      const getRes = http.get(`${BASE_URL}/api/teachers/${teacherId}`, authHeaders)
      check(getRes, {
        'get teacher 200': r => r.status === 200,
      })
    }
  })

  group('Classes endpoints', function() {
    const res = http.get(`${BASE_URL}/api/classes`, authHeaders)
    check(res, {
      'classes list 200': r => r.status === 200,
    })
  })

  group('Search and filters', function() {
    const searchRes = http.get(`${BASE_URL}/api/students?search=Load`, authHeaders)
    check(searchRes, {
      'search students 200': r => r.status === 200,
    })

    const paginationRes = http.get(`${BASE_URL}/api/students?page=1&limit=10`, authHeaders)
    check(paginationRes, {
      'pagination works': r => r.status === 200,
    })
  })

  sleep(Math.random() * 2 + 1)
}

export function teardown(data) {
  console.log('Load test completed')
}
