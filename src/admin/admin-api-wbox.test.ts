import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getWboxStatus,
  retryWboxExport,
  setWboxMapping,
  syncWboxCatalog,
  getSettings,
  updateSettings,
  RateLimitError,
} from './admin-api'
import { useAdminStore } from './admin-store'

describe('WBOX POS Integration & Resilience Test Suite (Level 2 & Level 3)', () => {
  const mockToken = 'test-admin-jwt-token'

  beforeEach(() => {
    vi.restoreAllMocks()
    useAdminStore.setState({ token: mockToken, user: { id: 1, name: 'Admin', email: 'admin@kiosk.com', role: 'admin' } })
  })

  describe('Level 2: WBOX POS Connection & Status Verification', () => {
    it('successfully retrieves WBOX status when folders and credentials are valid', async () => {
      const mockWboxStatusPayload = {
        connection: {
          request_path: { exists: true, writable: true },
          response_path: { exists: true, readable: true },
          credentials_configured: true,
        },
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockWboxStatusPayload,
      })

      const result = await getWboxStatus(mockToken)

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/settings/wbox/status'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      )
      expect(result.connection.request_path.exists).toBe(true)
      expect(result.connection.request_path.writable).toBe(true)
      expect(result.connection.response_path.exists).toBe(true)
      expect(result.connection.response_path.readable).toBe(true)
      expect(result.connection.credentials_configured).toBe(true)
    })

    it('identifies when WBOX request or response folders are missing / unwritable', async () => {
      const mockFailedFolderPayload = {
        connection: {
          request_path: { exists: false, writable: false },
          response_path: { exists: true, readable: false },
          credentials_configured: false,
        },
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockFailedFolderPayload,
      })

      const result = await getWboxStatus(mockToken)

      expect(result.connection.request_path.exists).toBe(false)
      expect(result.connection.request_path.writable).toBe(false)
      expect(result.connection.response_path.readable).toBe(false)
      expect(result.connection.credentials_configured).toBe(false)
    })

    it('successfully triggers a retry export for a failed WBOX order', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, message: 'Order exported to WBOX successfully.' }),
      })

      const result = await retryWboxExport(mockToken, 42)

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/orders/42/wbox-retry'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      )
      expect(result.success).toBe(true)
      expect(result.message).toContain('exported to WBOX')
    })

    it('successfully maps a product catalog SKU to a WBOX menukey item code', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      })

      const result = await setWboxMapping(mockToken, 101, 'BURGER-WB-01')

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/products/101/wbox-mapping'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ menukey: 'BURGER-WB-01' }),
        })
      )
      expect(result.success).toBe(true)
    })

    it('loads and parses all WBOX configuration parameters in admin settings', async () => {
      const mockSettings = {
        settings: {
          id: 1,
          brand_name: 'Burger & Co',
          tax_rate_basis_points: 1200,
          service_mode: 'both',
          currency: 'PHP',
          counter_payment_enabled: true,
          card_payment_enabled: true,
          idle_timeout_seconds: 60,
          auto_reset_seconds: 15,
          receipt_header: 'Thank you!',
          receipt_footer: 'Come again!',
          welcome_background_url: null,
          welcome_background_image: null,
          timezone: 'Asia/Manila',
          wbox_enabled: true,
          wbox_request_path: 'C:\\WBOX\\Request',
          wbox_response_path: 'C:\\WBOX\\Response',
          wbox_kiosk_number: 'KIOSK-01',
          wbox_version: '1.0',
          wbox_pdaver: '2.0',
          wbox_server: '192.168.1.100',
          wbox_device: 'POS-01',
          wbox_product: 'RETAIL',
          wbox_response_filename: 'response.json',
          wbox_retry_seconds: 30,
          wbox_auth_token_configured: true,
        },
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockSettings,
      })

      const result = await getSettings(mockToken)

      expect(result.settings.wbox_enabled).toBe(true)
      expect(result.settings.wbox_request_path).toBe('C:\\WBOX\\Request')
      expect(result.settings.wbox_response_path).toBe('C:\\WBOX\\Response')
      expect(result.settings.wbox_kiosk_number).toBe('KIOSK-01')
      expect(result.settings.wbox_server).toBe('192.168.1.100')
      expect(result.settings.wbox_auth_token_configured).toBe(true)
    })

    it('gracefully handles legacy backends where WBOX fields are undefined or null', async () => {
      const mockLegacySettings = {
        settings: {
          id: 1,
          brand_name: 'Burger & Co',
          tax_rate_basis_points: 1200,
          service_mode: 'both',
          currency: 'PHP',
          counter_payment_enabled: 1,
          card_payment_enabled: 1,
          idle_timeout_seconds: 60,
          auto_reset_seconds: 15,
          receipt_header: null,
          receipt_footer: null,
          // All wbox_* fields are omitted (undefined)
        },
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockLegacySettings,
      })

      const result = await getSettings(mockToken)

      expect(result.settings.wbox_enabled).toBe(false)
      expect(result.settings.wbox_request_path).toBeNull()
      expect(result.settings.wbox_kiosk_number).toBe('KIOSK-01')
      expect(result.settings.wbox_auth_token_configured).toBe(false)
    })

    it('updates WBOX configuration including optional auth token', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          settings: {
            id: 1,
            brand_name: 'Burger & Co',
            tax_rate_basis_points: 1200,
            service_mode: 'both',
            currency: 'PHP',
            counter_payment_enabled: true,
            card_payment_enabled: true,
            idle_timeout_seconds: 60,
            auto_reset_seconds: 15,
            receipt_header: null,
            receipt_footer: null,
            timezone: 'Asia/Manila',
            wbox_enabled: true,
            wbox_request_path: 'D:\\WBOX\\Request',
            wbox_response_path: 'D:\\WBOX\\Response',
            wbox_kiosk_number: 'KIOSK-02',
            wbox_version: '1.0',
            wbox_pdaver: '1.0',
            wbox_server: '127.0.0.1',
            wbox_device: 'POS-02',
            wbox_product: 'RETAIL',
            wbox_response_filename: 'response.json',
            wbox_retry_seconds: 60,
            wbox_auth_token_configured: true,
          },
        }),
      })

      const updatePayload = {
        brand_name: 'Burger & Co',
        tax_rate_basis_points: 1200,
        service_mode: 'both' as const,
        currency: 'PHP' as const,
        counter_payment_enabled: true,
        card_payment_enabled: true,
        idle_timeout_seconds: 60,
        auto_reset_seconds: 15,
        receipt_header: null,
        receipt_footer: null,
        wbox_enabled: true,
        wbox_request_path: 'D:\\WBOX\\Request',
        wbox_response_path: 'D:\\WBOX\\Response',
        wbox_kiosk_number: 'KIOSK-02',
        wbox_auth_token: 'secret-token-123',
      }

      const result = await updateSettings(mockToken, updatePayload)

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/settings'),
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"wbox_kiosk_number":"KIOSK-02"'),
        })
      )
      expect(result.settings.wbox_kiosk_number).toBe('KIOSK-02')
    })
  })

  describe('Level 3: Non-Functional Resilience, Error Handling & Security', () => {
    it('handles HTTP 429 Rate Limiting by throwing RateLimitError with retry-after value', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers({ 'Retry-After': '45' }),
        json: async () => ({ message: 'Too many requests' }),
      })

      await expect(getWboxStatus(mockToken)).rejects.toThrow(RateLimitError)
      await expect(getWboxStatus(mockToken)).rejects.toThrow('Try again in 45 seconds.')
    })

    it('handles HTTP 401 Session Expiration by clearing admin state and emitting session-expired event', async () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers(),
        json: async () => ({ message: 'Unauthorized' }),
      })

      await expect(getWboxStatus(mockToken)).rejects.toThrow('Your session expired. Please sign in again.')
      expect(useAdminStore.getState().token).toBeNull()
      expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'admin:session-expired' }))
    })

    it('gracefully handles non-JSON / corrupted responses from server', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        headers: new Headers(),
        json: async () => {
          throw new Error('Unexpected token < in JSON at position 0')
        },
      })

      await expect(getWboxStatus(mockToken)).rejects.toThrow('The server returned an invalid response.')
    })

    it('handles WBOX retry error when order is not found or cannot be written', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers(),
        json: async () => ({ message: 'Order #999 not found for WBOX export.' }),
      })

      await expect(retryWboxExport(mockToken, 999)).rejects.toThrow('Order #999 not found for WBOX export.')
    })

    it('triggers WBOX catalog inquiry and reports pending status when response is not yet generated', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({
          success: true,
          pending: true,
          inquiry_sent: true,
          message: 'Inquiry packet QUERY_MENU.json sent to Request folder.',
        }),
      })

      const res = await syncWboxCatalog(mockToken)
      expect(res.success).toBe(true)
      expect(res.pending).toBe(true)
      expect(res.inquiry_sent).toBe(true)
    })

    it('successfully synchronizes and ingests products returned by WBOX POS', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({
          success: true,
          pending: false,
          source_file: 'MENU_LIST.json',
          updated: 5,
          created: 2,
          total: 7,
          message: 'Successfully synced 5 updated and 2 new products from WBOX (MENU_LIST.json).',
        }),
      })

      const res = await syncWboxCatalog(mockToken)
      expect(res.success).toBe(true)
      expect(res.pending).toBe(false)
      expect(res.updated).toBe(5)
      expect(res.created).toBe(2)
      expect(res.total).toBe(7)
    })
  })
})
