import { useState } from 'react'
import { getCached, setCache } from '../cache-helpers'
import { useDisposable } from 'mobx-react-lite'
import { autorun } from 'mobx'

export function useCachedObservable<T>(
  cacheKey: string,
  fromJSON: (json: any) => T,
  toJSON: (store: T) => any,
): T {
  const [store] = useState(() => fromJSON(getCached(cacheKey)))
  useDisposable(() =>
    autorun(() => {
      setCache(cacheKey, toJSON(store))
    }),
  )
  return store
}
