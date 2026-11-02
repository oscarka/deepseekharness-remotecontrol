import { createReadStream } from 'node:fs'
import { basename, extname } from 'node:path'
import * as Lark from '@larksuiteoapi/node-sdk'

const APP_ID_PATTERN = /^cli_[0-9a-fA-F]{16}$/

/**
 * Thin Feishu transport. It only opens an outbound long connection and sends
 * text messages; no public callback URL or inbound port is required.
 * Supports dynamic pause/resume (Standby <-> Active) for multi-host coordination.
 */
export class FeishuTransport {
  constructor({ appId, appSecret, onEvent, onCardAction, onStatus, logger }) {
    if (!APP_ID_PATTERN.test(appId)) throw new Error('Feishu App ID must look like cli_<16 hex characters>')
    if (!appSecret) throw new Error('Feishu App Secret is empty')
    this.appId = appId
    this.appSecret = appSecret
    this.logger = logger
    this.onEvent = onEvent
    this.onCardAction = onCardAction
    this.onStatus = onStatus
    this.connected = false
    this.started = false
    this.client = new Lark.Client({ appId, appSecret })
    this.dispatcher = new Lark.EventDispatcher({})
    this.dispatcher.register({
      'im.message.receive_v1': data => this.dispatch(data),
      'card.action.trigger': data => this.dispatchCard(data),
    })
    this.ws = this.createWSClient()
  }

  createWSClient() {
    return new Lark.WSClient({
      appId: this.appId,
      appSecret: this.appSecret,
      source: 'dsh-feishu',
      handshakeTimeoutMs: 15_000,
      onReady: () => {
        this.connected = true
        this.logger?.info?.('dsh-feishu: Feishu long connection ready')
        this.onStatus?.('ready')
      },
      onReconnecting: () => {
        this.connected = false
        this.logger?.warn?.('dsh-feishu: Feishu long connection reconnecting')
        this.onStatus?.('reconnecting')
      },
      onReconnected: () => {
        this.connected = true
        this.logger?.info?.('dsh-feishu: Feishu long connection reconnected')
        this.onStatus?.('reconnected')
      },
      onError: error => {
        this.connected = false
        this.logger?.warn?.(`dsh-feishu: Feishu long connection failed: ${error?.message ?? error}`)
        this.onStatus?.('error', error?.message ?? String(error))
      },
    })
  }

  async start() {
    if (this.started) return
    if (!this.ws) this.ws = this.createWSClient()
    this.started = true
    await this.ws.start({ eventDispatcher: this.dispatcher })
  }

  async stop() {
    this.connected = false
    if (!this.started && !this.ws) return
    this.started = false
    try {
      this.ws?.close?.({ force: true })
    } catch {
      // ignore close errors
    }
    this.ws = null
  }

  async dispatchCard(raw) {
    try {
      const payload = raw?.event ?? raw
      const event = payload?.chatId ? payload : Lark.normalizeCardAction?.(payload, { includeRaw: true })
      if (!event) {
        this.logger?.warn?.('dsh-feishu: could not normalize card action')
        return
      }
      event.formValue = payload?.action?.form_value ?? payload?.action?.formValue ?? event?.raw?.action?.form_value ?? undefined
      return await this.onCardAction?.(event)
    } catch (error) {
      this.logger?.warn?.(`dsh-feishu: card action failed: ${error?.message ?? error}`)
    }
  }

  async dispatch(data) {
    try {
      await this.onEvent?.(data)
    } catch (error) {
      this.logger?.warn?.(`dsh-feishu: event handler failed: ${error?.message ?? error}`)
    }
  }

  async sendCard(chatId, card) {
    const response = await this.client.im.message.create({
      params: { receive_id_type: 'chat_id' },
      data: {
        receive_id: chatId,
        msg_type: 'interactive',
        content: JSON.stringify(card),
      },
    })
    if (response?.code !== undefined && response.code !== 0) {
      throw new Error(`Feishu card send failed: ${response.code} ${response.msg ?? ''}`.trim())
    }
    return response
  }

  async updateCard(messageId, card) {
    const response = await this.client.im.message.patch({
      path: { message_id: messageId },
      data: { content: JSON.stringify(card) },
    })
    if (response?.code !== undefined && response.code !== 0) {
      throw new Error(`Feishu card update failed: ${response.code} ${response.msg ?? ''}`.trim())
    }
    return response
  }

  async uploadImage(path) {
    const response = await this.client.im.image.create({
      data: { image_type: 'message', image: createReadStream(path) },
    })
    return response?.image_key ?? response?.data?.image_key
  }

  async sendVideo(chatId, path) {
    const ext = extname(path).toLowerCase()
    const fileType = ['.mp4', '.mov', '.webm'].includes(ext) ? 'mp4' : 'stream'
    const uploaded = await this.client.im.file.create({
      data: {
        file_type: fileType,
        file_name: basename(path),
        file: createReadStream(path),
      },
    })
    const fileKey = uploaded?.file_key ?? uploaded?.data?.file_key
    if (!fileKey) throw new Error('Feishu file upload returned no file_key')
    const response = await this.client.im.message.create({
      params: { receive_id_type: 'chat_id' },
      data: {
        receive_id: chatId,
        msg_type: 'media',
        content: JSON.stringify({ file_key: fileKey }),
      },
    })
    if (response?.code !== undefined && response.code !== 0) {
      throw new Error(`Feishu video send failed: ${response.code} ${response.msg ?? ''}`.trim())
    }
    return response
  }

  async sendText(chatId, text) {
    const response = await this.client.im.message.create({
      params: { receive_id_type: 'chat_id' },
      data: {
        receive_id: chatId,
        msg_type: 'text',
        content: JSON.stringify({ text: String(text) }),
      },
    })
    if (response?.code !== undefined && response.code !== 0) {
      throw new Error(`Feishu send failed: ${response.code} ${response.msg ?? ''}`.trim())
    }
    return response
  }
}
