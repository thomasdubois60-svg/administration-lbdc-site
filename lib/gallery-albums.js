const record = (value) => value && typeof value === 'object' ? value : {};
const text = (value) => typeof value === 'string' ? value : '';
const position = (value, fallback) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
export function normalizeGalleryAlbums(source = {}) {
    const albums = Array.isArray(source.galleryAlbums) ? source.galleryAlbums
        : Array.isArray(source.gallery) && source.gallery.length ? [{ id: 'legacy-gallery', title: 'Galerie', photos: source.gallery }] : [];
    const ids = new Set();
    return albums.map((value, index) => {
        const album = record(value);
        let id = text(album.id) || `album-${index}`;
        while (ids.has(id))
            id += `-${index}`;
        ids.add(id);
        const photos = (Array.isArray(album.photos) ? album.photos : []).map((value, photoIndex) => {
            const photo = record(value);
            return { id: text(photo.id) || `${id}-photo-${photoIndex}`, image: text(photo.image) || text(photo.src), imageAlt: text(photo.imageAlt) || text(photo.alt), label: text(photo.label), order: position(photo.order, photoIndex) };
        }).sort((a, b) => a.order - b.order).map((photo, order) => ({ ...photo, order }));
        return { id, title: text(album.title), order: position(album.order, index), photos };
    }).sort((a, b) => a.order - b.order).map((album, order) => ({ ...album, order }));
}
