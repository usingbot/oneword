import { useState } from 'react'
import type { CardFace, CardImage } from '../application/study-pack'

function RemoteImage({ image }: { image: CardImage }) {
  const [load, setLoad] = useState(false)
  const [failed, setFailed] = useState(false)
  return <figure className="study-image">
    {load && !failed ? <img src={image.url} alt={image.alt} crossOrigin="anonymous" referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : <p>{image.alt}</p>}
    {image.caption && <figcaption>{image.caption}</figcaption>}
    {image.essential && <p>Ảnh thiết yếu để trả lời.</p>}
    {!load && <><p>Ảnh từ {new URL(image.url).hostname}. Chỉ tải khi bạn chọn; máy chủ ảnh sẽ nhận địa chỉ IP của bạn.</p><button onClick={() => setLoad(true)}>Tải ảnh này</button></>}
    {failed && <p role="status">Không tải được ảnh. {image.essential ? 'Thiếu ảnh thiết yếu: hãy bỏ qua thẻ này, không tính sai.' : 'Bạn vẫn có thể dùng phần chữ và mô tả.'} Máy chủ ảnh có thể không cho phép tải từ ứng dụng này.</p>}
  </figure>
}
export function Face({ face }: { face: CardFace }) { return <><p className="card-content">{face.text}</p>{face.image && <RemoteImage key={face.image.url} image={face.image} />}</> }
