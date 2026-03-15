# 🎓 UNT Prep — Платформа для подготовки к ЕНТ

Веб-приложение для персонализированной подготовки к Единому национальному тестированию (ЕНТ) с использованием технологий искусственного интеллекта.

## 🏗 Архитектура

**Layered Architecture** (Многоуровневая архитектура):

```
Frontend (Vue.js 3 + Bootstrap 5)
    ↕ REST API (HTTPS)
Backend (Node.js + Express)
    ├── Routes → Controllers → Services
    ├── PostgreSQL (данные)
    ├── Redis (кэширование)
    └── Dify AI (ИИ-интеграция)
```

## 🚀 Быстрый старт

### С Docker (рекомендуется)
```bash
docker-compose up -d
# Frontend: http://localhost:5173
# Backend API: http://localhost:3000
```

### Локально
```bash
# 1. База данных (PostgreSQL должен быть запущен)
psql -U postgres -d unt_platform -f backend/init.sql

# 2. Backend
cd backend
cp .env.example .env  # настроить подключение к БД
npm install
npm run dev

# 3. Frontend
cd frontend
npm install
npm run dev
```

## 📡 API Endpoints

### Аутентификация
| Method | URL | Описание |
|--------|-----|----------|
| POST | `/api/auth/register` | Регистрация |
| POST | `/api/auth/login` | Вход |

### Тесты
| Method | URL | Описание |
|--------|-----|----------|
| GET | `/api/tests` | Список тестов |
| GET | `/api/tests/subjects` | Список предметов |
| GET | `/api/tests/:id` | Детали теста |
| GET | `/api/tests/:id/questions` | Вопросы теста (🔒) |
| POST | `/api/tests/submit` | Отправить ответы (🔒) |
| GET | `/api/tests/results/:attemptId` | Результаты (🔒) |
| GET | `/api/tests/history/:userId` | История (🔒) |
| GET | `/api/tests/leaderboard` | Рейтинг |

### ИИ
| Method | URL | Описание |
|--------|-----|----------|
| POST | `/api/ai/chat` | Чат с ИИ (🔒) |
| GET | `/api/ai/learning-path/:userId` | План обучения (🔒) |
| POST | `/api/ai/explain` | Объяснение вопроса (🔒) |

### Администрирование (🔒 Admin)
| Method | URL | Описание |
|--------|-----|----------|
| GET | `/api/admin/stats` | Статистика |
| GET | `/api/admin/students` | Список студентов |
| GET/POST | `/api/admin/questions` | CRUD вопросов |
| PUT/DELETE | `/api/admin/questions/:id` | Обновить/Удалить |
| POST | `/api/admin/tests` | Создать тест |
| DELETE | `/api/admin/tests/:id` | Удалить тест |

🔒 = требуется JWT токен

## 🛡️ Безопасность

- **JWT** (JSON Web Tokens) — аутентификация
- **Argon2id** — хэширование паролей
- **Helmet** — HTTP security headers
- **Rate Limiting** — защита от брутфорса
- **CORS** — контроль доменов
- **Параметризованные SQL запросы** — защита от инъекций

## 🌐 Мультиязычность

Поддержка 3 языков: 🇷🇺 Русский | 🇰🇿 Қазақша | 🇬🇧 English

## 🛠 Технологии

| Компонент | Технология |
|-----------|-----------|
| Frontend | Vue.js 3, Bootstrap 5, Pinia, Vue Router, Vue I18n |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Caching | Redis |
| AI | Dify (LLM Integration) |
| Security | JWT, Argon2 |
| DevOps | Docker, GitHub Actions |
