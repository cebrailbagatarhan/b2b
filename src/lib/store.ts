import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CartItem = {
  productId: string
  productName: string
  stockCode: string
  unitId: string
  unitName: string
  multiplier: number
  quantity: number
  unitPrice: number
  currency: string
  imageUrl?: string | null
}

type CartState = {
  items: CartItem[]
  addToCart: (item: CartItem) => void
  removeFromCart: (productId: string, unitId: string) => void
  updateQuantity: (productId: string, unitId: string, quantity: number) => void
  clearCart: () => void
  totalItems: () => number
  totalAmount: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addToCart: (item) => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            (i) => i.productId === item.productId && i.unitId === item.unitId
          )
          if (existingIndex >= 0) {
            const updated = [...state.items]
            updated[existingIndex] = {
              ...updated[existingIndex],
              quantity: updated[existingIndex].quantity + item.quantity,
            }
            return { items: updated }
          }
          return { items: [...state.items, item] }
        })
      },

      removeFromCart: (productId, unitId) => {
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.productId === productId && i.unitId === unitId)
          ),
        }))
      },

      updateQuantity: (productId, unitId, quantity) => {
        if (quantity < 1) return
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId && i.unitId === unitId
              ? { ...i, quantity }
              : i
          ),
        }))
      },

      clearCart: () => set({ items: [] }),

      totalItems: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0)
      },

      totalAmount: () => {
        return get().items.reduce(
          (sum, item) => sum + item.unitPrice * item.quantity * item.multiplier,
          0
        )
      },
    }),
    {
      name: 'toptan-cart-storage',
    }
  )
)

export type User = {
  id: string
  name: string
  email: string
  companyCode?: string | null
  balance?: number
  discountRate?: number
  riskLimit?: number
  adminRole?: string
  role: 'ADMIN' | 'CUSTOMER'
  proxyUser?: User | null
}

type AuthState = {
  user: User | null
  proxyUser: User | null
  login: (user: User) => void
  setProxyUser: (user: User | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      proxyUser: null,
      login: (user) => {
        set({ user });
        if (user.role === 'ADMIN') {
          useCartStore.getState().clearCart();
        }
      },
      setProxyUser: (user) => set({ proxyUser: user }),
      logout: () => {
        set({ user: null, proxyUser: null });
        useCartStore.getState().clearCart();
      },
    }),
    {
      name: 'toptan-auth-storage',
    }
  )
)
