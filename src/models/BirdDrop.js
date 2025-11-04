/**
 * BirdDrop Model
 * Represents a bird drop detection case
 */

export class BirdDrop {
  constructor(data = {}) {
    this.id = data.id || null;
    this.worker = data.worker ? new Personnel(data.worker) : null;
    this.source = data.source || '';
    this.images = data.images ? new Images(data.images) : new Images();
    this.status = data.status ? new Status(data.status) : new Status();
    this.carpool = data.carpool ? new Carpool(data.carpool) : new Carpool();
    this.detectedDate = data.detectedDate || data.detected_date || '';
    this.createdAt = data.createdAt || data.created_at || '';
    this.updatedAt = data.updatedAt || data.updated_at || '';
  }

  static fromJson(json) {
    return new BirdDrop(json);
  }

  toJson() {
    return {
      id: this.id,
      worker: this.worker?.toJson() || null,
      source: this.source,
      images: this.images.toJson(),
      status: this.status.toJson(),
      carpool: this.carpool.toJson(),
      detectedDate: this.detectedDate,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export class Personnel {
  constructor(data = {}) {
    this.id = data.id || null;
    this.username = data.username || '';
    this.fullname = data.fullname || data.full_name || '';
    this.email = data.email || '';
    this.role = data.role || '';
  }

  static fromJson(json) {
    return new Personnel(json);
  }

  toJson() {
    return {
      id: this.id,
      username: this.username,
      fullname: this.fullname,
      email: this.email,
      role: this.role,
    };
  }
}

export class Images {
  constructor(data = {}) {
    this.casePhoto = data.casePhoto || data.case_photo || '';
    this.originPhoto = data.originPhoto || data.origin_photo || '';
    this.thumbnail = data.thumbnail || '';
  }

  static fromJson(json) {
    return new Images(json);
  }

  toJson() {
    return {
      casePhoto: this.casePhoto,
      originPhoto: this.originPhoto,
      thumbnail: this.thumbnail,
    };
  }
}

export class Status {
  constructor(data = {}) {
    this.id = data.id || 1; // 1=Pending, 2=Confirmed, 3=False Detection
    this.name = data.name || 'Pending';
  }

  static fromJson(json) {
    return new Status(json);
  }

  toJson() {
    return {
      id: this.id,
      name: this.name,
    };
  }

  get isPending() {
    return this.id === 1;
  }

  get isConfirmed() {
    return this.id === 2 || this.id === 4;
  }

  get isFalseDetection() {
    return this.id === 3 || this.id === 5;
  }
}

export class Carpool {
  constructor(data = {}) {
    this.area = data.area || '';
    this.block = data.block || '';
    this.latitude = data.latitude || data.lat || null;
    this.longitude = data.longitude || data.long || data.lng || null;
  }

  static fromJson(json) {
    return new Carpool(json);
  }

  toJson() {
    return {
      area: this.area,
      block: this.block,
      latitude: this.latitude,
      longitude: this.longitude,
    };
  }
}
