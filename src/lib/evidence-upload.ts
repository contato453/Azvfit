import { uploadEvidenceToDrive } from '#/server/drive'

/** Envia o arquivo direto para o Google Drive (pasta do colaborador) via server function. */
export async function uploadEvidence(file: File, userId: string, userName: string) {
  const formData = new FormData()
  formData.set('file', file)
  formData.set('userId', userId)
  formData.set('userName', userName)
  return uploadEvidenceToDrive({ data: formData })
}
