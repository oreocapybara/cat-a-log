const DB_NAME = 'cat-a-log'
const STORE_NAME = 'pendingTagPhoto'
const PHOTO_KEY = 'photo'
const STORAGE_KEY = 'pendingTag'

export type PendingTag = {
  name: string
  lat: number
  lng: number
  isEarTipped: boolean
  notes: string | null
  tags: string[]
  version: 1
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function putPhoto(photo: File): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(photo, PHOTO_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

async function getPhoto(): Promise<File | null> {
  const db = await openDb()
  const photo = await new Promise<File | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).get(PHOTO_KEY)
    request.onsuccess = () => resolve((request.result as File) ?? null)
    request.onerror = () => reject(request.error)
  })
  db.close()
  return photo
}

async function deletePhoto(): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(PHOTO_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function writePendingTag(tag: PendingTag, photo: File): Promise<void> {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tag))
  try {
    await putPhoto(photo)
  } catch (err) {
    localStorage.removeItem(STORAGE_KEY)
    throw err
  }
}

export async function readPendingTag(): Promise<{ tag: PendingTag; photo: File } | null> {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  const photo = await getPhoto()
  if (!photo) return null
  return { tag: JSON.parse(raw) as PendingTag, photo }
}

export async function clearPendingTag(): Promise<void> {
  localStorage.removeItem(STORAGE_KEY)
  await deletePhoto()
}
