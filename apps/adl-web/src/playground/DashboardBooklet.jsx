import React, { useMemo, useState } from 'react'

import { AgentBrainDashboard } from '../components/game/mechanics/AgentBrainDashboard'
import { HoldBox } from '../components/game/mechanics/HoldBox'
import { projectWorldFactsTable } from '../components/game/core/worldFacts'

const CHAT_API_URL = 'http://127.0.0.1:8001/api/chat'

const DASHBOARD_PAGES = [
  { id: 'brain', label: 'Brain' },
  { id: 'chat', label: 'Chat' },
  { id: 'history', label: 'History' },
  { id: 'wf-json', label: 'WF JSON' },
  { id: 'wf-table', label: 'WF Table' },
  { id: 'hold', label: 'Hold' }
]

export function DashboardBooklet({
  observation,
  action,
  isThinking,
  intentHistory,
  onClearHistory,
  snapshotPreview,
  onRefreshWorldFacts,
  holdingItem,
  cubes
}) {
  const [dashboardPage, setDashboardPage] = useState('brain')
  const [chatInput, setChatInput] = useState('nice to meet you')
  const [chatReply, setChatReply] = useState('')
  const [chatError, setChatError] = useState('')
  const [chatSending, setChatSending] = useState(false)

  const snapshotTableRows = useMemo(() => {
    if (!snapshotPreview) return []
    return projectWorldFactsTable(snapshotPreview)
  }, [snapshotPreview])

  const sendGreeting = async () => {
    const text = (chatInput || '').trim()
    if (!text || chatSending) return

    setChatSending(true)
    setChatError('')

    try {
      const response = await fetch(CHAT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })

      if (!response.ok) {
        throw new Error(`Chat API error: ${response.status}`)
      }

      const data = await response.json()
      setChatReply(String(data?.text || ''))
    } catch (error) {
      setChatError(error instanceof Error ? error.message : String(error))
    } finally {
      setChatSending(false)
    }
  }

  const renderPage = () => {
    if (dashboardPage === 'brain') {
      return (
        <AgentBrainDashboard
          observation={observation}
          action={action}
          isThinking={isThinking}
          embedded
        />
      )
    }

    if (dashboardPage === 'chat') {
      return (
        <div className="space-y-2">
          <div className="text-[10px] text-gray-400">Greeting Test (/api/chat)</div>
          <textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            rows={3}
            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-[11px] text-gray-100 outline-none focus:border-cyan-400"
            placeholder="Type a greeting..."
          />
          <div className="flex items-center gap-2">
            <button
              onClick={sendGreeting}
              disabled={chatSending}
              className="px-3 py-1 rounded text-[10px] bg-cyan-700/80 border border-cyan-400 text-white hover:bg-cyan-600 disabled:opacity-50"
            >
              {chatSending ? 'Sending...' : 'Send Greeting'}
            </button>
            <button
              onClick={() => setChatInput('nice to meet you')}
              className="px-3 py-1 rounded text-[10px] bg-gray-800 border border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Fill Example
            </button>
          </div>

          {chatReply && (
            <div className="bg-gray-900/80 border border-gray-700 rounded p-2">
              <div className="text-[10px] text-green-300 mb-1">Reply</div>
              <pre className="whitespace-pre-wrap break-words text-[11px] leading-4">{chatReply}</pre>
            </div>
          )}

          {chatError && (
            <div className="bg-red-900/30 border border-red-700 rounded p-2 text-[10px] text-red-300">
              {chatError}
            </div>
          )}
        </div>
      )
    }

    if (dashboardPage === 'history') {
      return (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold text-green-300">History ({intentHistory.length})</div>
            <button
              onClick={onClearHistory}
              className="px-2 py-0.5 text-[10px] bg-gray-700 rounded hover:bg-gray-600 transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="overflow-y-auto max-h-[30rem] space-y-2">
            {intentHistory.length === 0 ? (
              <div className="text-gray-500">No history yet.</div>
            ) : (
              intentHistory.map((entry, idx) => (
                <div key={entry.key} className="bg-gray-900/80 border border-gray-700 rounded p-2">
                  <div className="text-[10px] text-gray-400 mb-1">#{idx + 1} step={entry.step_id ?? '-'}</div>
                  {entry.error && entry.error.error_code !== 'OK' && (
                    <div className="text-[10px] mb-1 text-red-300">
                      error={entry.error.error_code} ({entry.error.module}/{entry.error.severity})
                    </div>
                  )}
                  <pre className="whitespace-pre-wrap break-words text-[10px] leading-4">
{JSON.stringify(
  {
    type: entry.type,
    target_poi: entry.target_poi,
    target_item: entry.target_item,
    interaction_type: entry.interaction_type,
    target_length: entry.target_length,
    content: entry.content,
    error: entry.error
      ? {
          error_code: entry.error.error_code,
          module: entry.error.module,
          severity: entry.error.severity,
          detail: entry.error.detail
        }
      : null
  },
  null,
  2
)}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      )
    }

    if (dashboardPage === 'wf-json') {
      if (!snapshotPreview) {
        return <div className="text-gray-500">No snapshot loaded. Click "Refresh WF".</div>
      }
      return (
        <pre className="whitespace-pre-wrap break-words text-[10px] leading-4">
{JSON.stringify(snapshotPreview, null, 2)}
        </pre>
      )
    }

    if (dashboardPage === 'wf-table') {
      if (!snapshotPreview) {
        return <div className="text-gray-500">No snapshot loaded. Click "Refresh WF".</div>
      }
      if (snapshotTableRows.length === 0) {
        return <div className="text-gray-500">No rows in table projection.</div>
      }
      return (
        <table className="w-full text-[10px] leading-4 border-collapse">
          <thead className="text-gray-400">
            <tr>
              <th className="text-left pb-1 pr-2">id</th>
              <th className="text-left pb-1 pr-2">state</th>
              <th className="text-left pb-1 pr-2">relation</th>
              <th className="text-left pb-1">position</th>
            </tr>
          </thead>
          <tbody>
            {snapshotTableRows.map((row) => (
              <tr key={row.id} className="border-t border-gray-800">
                <td className="py-1 pr-2 align-top break-all">{row.id}</td>
                <td className="py-1 pr-2 align-top">{row.state || '-'}</td>
                <td className="py-1 pr-2 align-top">{row.relation || '-'}</td>
                <td className="py-1 align-top">{Array.isArray(row.position) ? `[${row.position.join(', ')}]` : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    }

    return (
      <div className="w-48">
        <HoldBox holdingItem={holdingItem} cubes={cubes} />
      </div>
    )
  }

  return (
    <div className="absolute top-20 right-2 left-2 md:left-auto md:right-4 bottom-4 z-50 md:w-[28rem] bg-black/85 text-gray-200 p-3 rounded-lg border border-gray-600 font-mono text-[11px] flex flex-col">
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="font-bold text-cyan-300">Dashboard Booklet</div>
        <button
          onClick={onRefreshWorldFacts}
          className="px-2 py-0.5 text-[10px] bg-gray-700 rounded hover:bg-gray-600 transition-colors"
        >
          Refresh WF
        </button>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {DASHBOARD_PAGES.map((page) => {
          const active = dashboardPage === page.id
          return (
            <button
              key={page.id}
              onClick={() => setDashboardPage(page.id)}
              className={`px-2 py-1 rounded text-[10px] border transition-colors ${active ? 'bg-cyan-700/80 border-cyan-400 text-white' : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'}`}
            >
              {page.label}
            </button>
          )
        })}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {renderPage()}
      </div>
    </div>
  )
}

