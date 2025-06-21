import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container, Typography, Box, TextField, MenuItem, Button, Alert, Paper
} from '@mui/material';

const AVAILABLE_TIMES = [
  '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00'
];

export default function App() {
  const [date, setDate] = useState('');
  const [busyTimes, setBusyTimes] = useState([]);
  const [blockedTimes, setBlockedTimes] = useState([]);
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (date) {
      // Получаем занятые и заблокированные времена
      axios.get('https://lawback.3gx.ru/api/busy-times?date=' + date)
        .then(res => setBusyTimes(res.data))
        .catch(() => setBusyTimes([]));
      axios.get('https://lawback.3gx.ru/api/blocks?date=' + date)
        .then(res => setBlockedTimes(res.data.map(b => b.time.slice(0,5))))
        .catch(() => setBlockedTimes([]));
      setTime('');
    } else {
      setBusyTimes([]);
      setBlockedTimes([]);
      setTime('');
    }
  }, [date]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user || {};
    try {
      await axios.post('https://lawback.3gx.ru/api/book', {
        name,
        phone,
        date,
        time,
        tg_first_name: tgUser.first_name || '',
        tg_last_name: tgUser.last_name || '',
        tg_username: tgUser.username || '',
        tg_id: tgUser.id || ''
      });
      setSubmitted(true);
      setTime('');
      setName('');
      setPhone('');
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка при отправке. Попробуйте ещё раз.');
    }
  };

  // Теперь фильтруем по занятым И заблокированным
  const freeTimes = AVAILABLE_TIMES.filter(
    t => !busyTimes.includes(t) && !blockedTimes.includes(t)
  );

  return (
    <Container maxWidth="sm" sx={{ mt: 6 }}>
      <Paper elevation={6} sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h5" align="center" gutterBottom>
          Запись на консультацию
        </Typography>
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          <TextField
            label="Дата"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
          <TextField
            select
            label="Время"
            value={time}
            onChange={e => setTime(e.target.value)}
            required
            disabled={!date || freeTimes.length === 0}
            helperText={!date ? "Сначала выберите дату" : (date && freeTimes.length === 0 ? "Нет доступных часов" : "")}
          >
            <MenuItem value="">Выберите время</MenuItem>
            {freeTimes.map(t => (
              <MenuItem key={t} value={t}>{t}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Имя"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <TextField
            label="Телефон"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            required
            placeholder="+7..."
          />
          <Button
            variant="contained"
            color="primary"
            type="submit"
            sx={{ fontWeight: 700, mt: 1 }}
            disabled={!date || !time || !name || !phone || freeTimes.length === 0}
          >
            Записаться
          </Button>
          {error && <Alert severity="error">{error}</Alert>}
          {submitted && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Спасибо! Ваша заявка отправлена.
            </Alert>
          )}
        </Box>
      </Paper>
    </Container>
  );
}
