import { useState } from 'react';

type DemoDocument = {
  id: string;
  title: string;
  code: string;
  type: string;
  version: string;
  pages: number;
  status: string;
  updated: string;
  summary: string;
  fragments: { page: number; clause: string; text: string }[];
};

const documents: DemoDocument[] = [
  {
    id: 'demo-vk-001',
    title: 'Пояснительная записка. Внутренний водопровод',
    code: 'ПЗ-ВК-001',
    type: 'PDF · Проектная документация',
    version: 'Редакция 03',
    pages: 48,
    status: 'Обработан (демо)',
    updated: '05.11.2026',
    summary: 'Демонстрационный пример состава проектной документации по внутреннему водоснабжению и канализации.',
    fragments: [
      { page: 12, clause: 'Раздел 4.2', text: 'Расчётные расходы воды приняты по заданию на проектирование. Значения требуют сопоставления с расчётами смежных разделов.' },
      { page: 27, clause: 'Раздел 6.1', text: 'Предусмотрены узлы учёта холодной и горячей воды. В реальной проверке здесь отображались бы извлечённые фрагменты и координаты источника.' },
    ],
  },
  {
    id: 'demo-vk-002',
    title: 'Спецификация оборудования и материалов',
    code: 'СП-ВК-002',
    type: 'XLSX · Спецификация',
    version: 'Редакция 02',
    pages: 9,
    status: 'Ожидает проверки (демо)',
    updated: '04.11.2026',
    summary: 'Пример ведомости оборудования, арматуры и материалов для демонстрации жизненного цикла документа.',
    fragments: [
      { page: 3, clause: 'Таблица 2', text: 'Ведомость содержит позиции трубопроводов, запорной арматуры и фасонных частей.' },
    ],
  },
  {
    id: 'demo-ar-001',
    title: 'Архитектурные решения. План первого этажа',
    code: 'АР-001',
    type: 'PDF · Графическая часть',
    version: 'Редакция 01',
    pages: 16,
    status: 'Загружен (демо)',
    updated: '03.11.2026',
    summary: 'Пример графического документа для демонстрации библиотеки проектных материалов.',
    fragments: [],
  },
];

export function DemoDocumentWorkspace() {
  const [selectedId, setSelectedId] = useState(documents[0].id);
  const [showAll, setShowAll] = useState(false);
  const selected = documents.find((item) => item.id === selectedId) ?? documents[0];
  const visible = showAll ? documents : documents.filter((item) => item.id.startsWith('demo-vk'));

  return (
    <section className="panel document-workspace" aria-label="Демонстрационная база знаний">
      <div className="document-heading">
        <div>
          <h2>Документы проекта</h2>
          <p>Примеры записей и извлечённых фрагментов. Это демонстрационные данные, не реальные проектные документы.</p>
        </div>
        <span className="status-chip">DEMO DATA</span>
      </div>
      <div className="document-grid">
        <div className="document-list">
          <div className="panel-heading">
            <div><h2>Библиотека</h2><p>{visible.length} демонстрационных документа</p></div>
            <button className="secondary-button compact-button" type="button" onClick={() => setShowAll((value) => !value)}>
              {showAll ? 'Только ВК' : 'Все проекты'}
            </button>
          </div>
          {visible.map((document) => (
            <button
              type="button"
              key={document.id}
              className={selected.id === document.id ? 'document-item selected' : 'document-item'}
              onClick={() => setSelectedId(document.id)}
            >
              <b>{document.title}</b>
              <small>{document.code} · {document.version}</small>
              <small>{document.type}</small>
            </button>
          ))}
        </div>
        <div className="document-detail">
          <div className="panel-heading">
            <div><h2>{selected.title}</h2><p>{selected.code} · {selected.version}</p></div>
            <span className="status-chip">{selected.status}</span>
          </div>
          <p className="muted">{selected.summary}</p>
          <div className="version-meta">
            <span>Страниц: <b>{selected.pages}</b></span>
            <span>Обновлён: <b>{selected.updated}</b></span>
            <span>Версия: <b>{selected.version}</b></span>
          </div>
          <div className="evidence-section">
            <h3>Извлечённые фрагменты</h3>
            {selected.fragments.length ? selected.fragments.map((fragment) => (
              <article className="fragment-card" key={fragment.clause}>
                <div><b>{fragment.clause}</b><small>Страница {fragment.page} · демонстрационный фрагмент</small></div>
                <p>{fragment.text}</p>
              </article>
            )) : <p className="muted">Для этого примера фрагменты пока не подготовлены.</p>}
          </div>
          <div className="evidence-section">
            <h3>Версии и обработка</h3>
            <div className="artifact-row"><span>Текущая версия</span><b>{selected.version}</b></div>
            <div className="artifact-row"><span>Последняя операция</span><b>Демонстрационная обработка</b></div>
            <div className="artifact-row"><span>Результат</span><b>Пример данных интерфейса</b></div>
          </div>
          <p className="muted">Загрузка файлов, OCR, индексирование и анализ здесь не выполняются. Для настоящей обработки потребуется подключённый PEA backend.</p>
        </div>
      </div>
    </section>
  );
}
