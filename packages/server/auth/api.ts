import axios from 'axios'

const request = axios.create({
  baseURL: 'http://127.0.0.1:4523/m1/6206985-5900354-default', // my local mock server
  timeout: 1000,
}).request

export function getPetDetail({ petId }: { petId: string }, token?: string) {
  return request({
    method: 'get',
    url: `/pet/${petId}`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}
