import { useState } from 'react'
import { useDrawer } from '../state/drawerStore'
import { N8N_WEBHOOK_URL } from '../config'

export default function N8nFormPanel() {
    const { fileQueue } = useDrawer()
    const [status, setStatus] = useState("Bekleniyor...")

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        // Determine input files (prioritize queue)
        const filesToSend = fileQueue

        if (filesToSend.length === 0) {
            setStatus('Hata: İşlem için dosya seçilmedi.')
            return
        }

        const fileIds = filesToSend.map(f => f.id)
        const fileNames = filesToSend.map(f => f.name)
        const webhookUrl = N8N_WEBHOOK_URL

        if (!webhookUrl) {
            setStatus('Hata: Webhook URL (VITE_N8N_WEBHOOK_URL) tanımlı değil.')
            return
        }

        setStatus(`Durum: ${fileIds.length} dosya ID'si ile n8n'e gönderiliyor...`)

        const formData = new FormData(e.currentTarget)
        const data = {
            positive_prompt: formData.get('positivePrompt'),
            negative_prompt: formData.get('negativePrompt'),
            scenario_prompt: formData.get('scenarioPrompt'),
            selected_files: fileIds,
            selected_file_names: fileNames // Optional: for debugging
        }

        fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
            .then(response => {
                if (response.ok) {
                    setStatus('Durum: Webhook başarıyla tetiklendi! İş akışı başladı.')
                } else {
                    setStatus(`Hata: Sorun oluştu. Kod: ${response.status}`)
                }
            })
            .catch(error => {
                setStatus(`Hata: ${error.message}`)
            })
    }

    return (
        <div className="n8n-form" style={{ marginTop: '10px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h3 className="liquid-drawer-title" style={{ fontSize: '1.2rem' }}>Görsel Üretme Paneli</h3>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0' }}>Seçili fotoğraflarla AI görsel üretimi</p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                    <label className="glass-label">Pozitif Prompt</label>
                    <textarea
                        name="positivePrompt"
                        rows={3}
                        required
                        defaultValue="Harika bir manzara, yüksek çözünürlük, sanatsal"
                        className="glass-input"
                        style={{ minHeight: '90px' }}
                    />
                </div>

                <div>
                    <label className="glass-label">Negatif Prompt</label>
                    <textarea
                        name="negativePrompt"
                        rows={3}
                        defaultValue="kötü anatomi, bulanık, kötü kalite, watermark"
                        className="glass-input"
                        style={{ minHeight: '90px' }}
                    />
                </div>

                <div>
                    <label className="glass-label">Senaryo Promptu</label>
                    <textarea
                        name="scenarioPrompt"
                        rows={4}
                        className="glass-input"
                        style={{ minHeight: '120px' }}
                    />
                </div>

                <div style={{ position: 'sticky', bottom: '-20px', background: 'rgba(20, 20, 25, 0.95)', padding: '20px 0', margin: '0 -24px -24px', paddingLeft: '24px', paddingRight: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
                    <button
                        type="submit"
                        className="glassButton primary"
                        disabled={fileQueue.length === 0}
                        style={{ width: '100%', justifyContent: 'center', height: '48px', fontSize: '16px' }}
                    >
                        {status.startsWith('Durum') || status === 'Bekleniyor...' ? (
                            `Gönder (${fileQueue.length} dosya)`
                        ) : (
                            status
                        )}
                    </button>
                    {status.includes('Hata') && (
                        <div style={{ marginTop: '10px', fontSize: '13px', color: '#f87171', textAlign: 'center' }}>
                            {status}
                        </div>
                    )}
                </div>
            </form>
        </div>
    )
}
