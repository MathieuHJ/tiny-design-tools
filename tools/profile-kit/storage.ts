import type { Crop } from './cropMath'
import type { Theme } from './model'

/**
 * The profile is kept in this browser's IndexedDB so a refresh does not lose it. It never leaves the device,
 * and CLEAR removes it. Every call fails quietly: private windows and full disks should not break the tool.
 */

export type SavedAsset = { name: string; blob: Blob; crop: Crop }

export type SavedProject = {
  version: 1
  displayName: string
  handle: string
  bio: string
  link: string
  theme: Theme
  format: 'png' | 'jpeg'
  avatar: SavedAsset | null
  banner: SavedAsset | null
  feed: SavedAsset[]
}

const DATABASE = 'tiny-design-tools-profile-kit'
const STORE = 'project'
const KEY = 'current'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB is unavailable.'))
    const request = indexedDB.open(DATABASE, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open storage.'))
    request.onblocked = () => reject(new Error('Storage is blocked.'))
  })
}

function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then((database) => new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE, mode)
    const request = action(transaction.objectStore(STORE))
    transaction.oncomplete = () => {
      database.close()
      resolve(request.result)
    }
    transaction.onerror = () => {
      database.close()
      reject(transaction.error ?? new Error('Storage failed.'))
    }
    transaction.onabort = () => {
      database.close()
      reject(transaction.error ?? new Error('Storage was full or refused.'))
    }
  }))
}

export function isSavedProject(value: unknown): value is SavedProject {
  const project = value as Partial<SavedProject> | null
  return Boolean(project && project.version === 1 && Array.isArray(project.feed) && typeof project.displayName === 'string')
}

export async function saveProject(project: SavedProject): Promise<boolean> {
  try {
    await run('readwrite', (store) => store.put(project, KEY))
    return true
  } catch {
    return false
  }
}

export async function loadProject(): Promise<SavedProject | null> {
  try {
    const value = await run('readonly', (store) => store.get(KEY))
    return isSavedProject(value) ? value : null
  } catch {
    return null
  }
}

export async function clearProject(): Promise<void> {
  try {
    await run('readwrite', (store) => store.delete(KEY))
  } catch {
    // Nothing was stored, or storage is unavailable. Either way there is nothing left to clear.
  }
}
