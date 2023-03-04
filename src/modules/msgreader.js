/* Copyright 2021 Yury Karpovich
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * This MSG Reader is created by Yury Karpovich
 * Under Github Repository https://github.com/ykarpovich/msg.reader
 */

/**
  DataStream reads scalars, arrays and structs of data from an ArrayBuffer.
  It's like a file-like DataView on steroids.

  @param {ArrayBuffer} arrayBuffer ArrayBuffer to read from.
  @param {?Number} byteOffset Offset from arrayBuffer beginning for the DataStream.
  @param {?Boolean} endianness DataStream.BIG_ENDIAN or DataStream.LITTLE_ENDIAN (the default).
  */
DataStream = function (arrayBuffer, byteOffset, endianness) {
	this._byteOffset = byteOffset || 0;
	if (arrayBuffer instanceof ArrayBuffer) {
		this.buffer = arrayBuffer;
	} else if (typeof arrayBuffer == 'object') {
		this.dataView = arrayBuffer;
		if (byteOffset) {
			this._byteOffset += byteOffset;
		}
	} else {
		this.buffer = new ArrayBuffer(arrayBuffer || 1);
	}
	this.position = 0;
	this.endianness = endianness == null ? DataStream.LITTLE_ENDIAN : endianness;
};
DataStream.prototype = {};

/* Fix for Opera 12 not defining BYTES_PER_ELEMENT in typed array prototypes. */
if (Uint8Array.prototype.BYTES_PER_ELEMENT === undefined) {
	Uint8Array.prototype.BYTES_PER_ELEMENT = Uint8Array.BYTES_PER_ELEMENT;
	Int8Array.prototype.BYTES_PER_ELEMENT = Int8Array.BYTES_PER_ELEMENT;
	Uint8ClampedArray.prototype.BYTES_PER_ELEMENT = Uint8ClampedArray.BYTES_PER_ELEMENT;
	Uint16Array.prototype.BYTES_PER_ELEMENT = Uint16Array.BYTES_PER_ELEMENT;
	Int16Array.prototype.BYTES_PER_ELEMENT = Int16Array.BYTES_PER_ELEMENT;
	Uint32Array.prototype.BYTES_PER_ELEMENT = Uint32Array.BYTES_PER_ELEMENT;
	Int32Array.prototype.BYTES_PER_ELEMENT = Int32Array.BYTES_PER_ELEMENT;
	Float64Array.prototype.BYTES_PER_ELEMENT = Float64Array.BYTES_PER_ELEMENT;
}

/**
    Saves the DataStream contents to the given filename.
    Uses Chrome's anchor download property to initiate download.
  
    @param {string} filename Filename to save as.
    @return {null}
    */
DataStream.prototype.save = function (filename) {
	var blob = new Blob(this.buffer);
	var URL = window.webkitURL || window.URL;
	if (URL && URL.createObjectURL) {
		var url = URL.createObjectURL(blob);
		var a = document.createElement('a');
		a.setAttribute('href', url);
		a.setAttribute('download', filename);
		a.click();
		URL.revokeObjectURL(url);
	} else {
		throw "DataStream.save: Can't create object URL.";
	}
};

/**
    Big-endian const to use as default endianness.
    @type {boolean}
    */
DataStream.BIG_ENDIAN = false;

/**
    Little-endian const to use as default endianness.
    @type {boolean}
    */
DataStream.LITTLE_ENDIAN = true;

/**
    Whether to extend DataStream buffer when trying to write beyond its size.
    If set, the buffer is reallocated to twice its current size until the
    requested write fits the buffer.
    @type {boolean}
    */
DataStream.prototype._dynamicSize = true;
Object.defineProperty(DataStream.prototype, 'dynamicSize', {
	get: function () {
		return this._dynamicSize;
	},
	set: function (v) {
		if (!v) {
			this._trimAlloc();
		}
		this._dynamicSize = v;
	},
});

/**
    Virtual byte length of the DataStream backing buffer.
    Updated to be max of original buffer size and last written size.
    If dynamicSize is false is set to buffer size.
    @type {number}
    */
DataStream.prototype._byteLength = 0;

/**
    Returns the byte length of the DataStream object.
    @type {number}
    */
Object.defineProperty(DataStream.prototype, 'byteLength', {
	get: function () {
		return this._byteLength - this._byteOffset;
	},
});

/**
    Set/get the backing ArrayBuffer of the DataStream object.
    The setter updates the DataView to point to the new buffer.
    @type {Object}
    */
Object.defineProperty(DataStream.prototype, 'buffer', {
	get: function () {
		this._trimAlloc();
		return this._buffer;
	},
	set: function (v) {
		this._buffer = v;
		this._dataView = new DataView(this._buffer, this._byteOffset);
		this._byteLength = this._buffer.byteLength;
	},
});

/**
    Set/get the byteOffset of the DataStream object.
    The setter updates the DataView to point to the new byteOffset.
    @type {number}
    */
Object.defineProperty(DataStream.prototype, 'byteOffset', {
	get: function () {
		return this._byteOffset;
	},
	set: function (v) {
		this._byteOffset = v;
		this._dataView = new DataView(this._buffer, this._byteOffset);
		this._byteLength = this._buffer.byteLength;
	},
});

/**
    Set/get the backing DataView of the DataStream object.
    The setter updates the buffer and byteOffset to point to the DataView values.
    @type {Object}
    */
Object.defineProperty(DataStream.prototype, 'dataView', {
	get: function () {
		return this._dataView;
	},
	set: function (v) {
		this._byteOffset = v.byteOffset;
		this._buffer = v.buffer;
		this._dataView = new DataView(this._buffer, this._byteOffset);
		this._byteLength = this._byteOffset + v.byteLength;
	},
});

/**
    Internal function to resize the DataStream buffer when required.
    @param {number} extra Number of bytes to add to the buffer allocation.
    @return {null}
    */
DataStream.prototype._realloc = function (extra) {
	if (!this._dynamicSize) {
		return;
	}
	var req = this._byteOffset + this.position + extra;
	var blen = this._buffer.byteLength;
	if (req <= blen) {
		if (req > this._byteLength) {
			this._byteLength = req;
		}
		return;
	}
	if (blen < 1) {
		blen = 1;
	}
	while (req > blen) {
		blen *= 2;
	}
	var buf = new ArrayBuffer(blen);
	var src = new Uint8Array(this._buffer);
	var dst = new Uint8Array(buf, 0, src.length);
	dst.set(src);
	this.buffer = buf;
	this._byteLength = req;
};

/**
    Internal function to trim the DataStream buffer when required.
    Used for stripping out the extra bytes from the backing buffer when
    the virtual byteLength is smaller than the buffer byteLength (happens after
    growing the buffer with writes and not filling the extra space completely).
  
    @return {null}
    */
DataStream.prototype._trimAlloc = function () {
	if (this._byteLength == this._buffer.byteLength) {
		return;
	}
	var buf = new ArrayBuffer(this._byteLength);
	var dst = new Uint8Array(buf);
	var src = new Uint8Array(this._buffer, 0, dst.length);
	dst.set(src);
	this.buffer = buf;
};

/**
    Sets the DataStream read/write position to given position.
    Clamps between 0 and DataStream length.
  
    @param {number} pos Position to seek to.
    @return {null}
    */
DataStream.prototype.seek = function (pos) {
	var npos = Math.max(0, Math.min(this.byteLength, pos));
	this.position = isNaN(npos) || !isFinite(npos) ? 0 : npos;
};

/**
    Returns true if the DataStream seek pointer is at the end of buffer and
    there's no more data to read.
  
    @return {boolean} True if the seek pointer is at the end of the buffer.
    */
DataStream.prototype.isEof = function () {
	return this.position >= this.byteLength;
};

/**
    Maps an Int32Array into the DataStream buffer, swizzling it to native
    endianness in-place. The current offset from the start of the buffer needs to
    be a multiple of element size, just like with typed array views.
  
    Nice for quickly reading in data. Warning: potentially modifies the buffer
    contents.
  
    @param {number} length Number of elements to map.
    @param {?boolean} e Endianness of the data to read.
    @return {Object} Int32Array to the DataStream backing buffer.
    */
DataStream.prototype.mapInt32Array = function (length, e) {
	this._realloc(length * 4);
	var arr = new Int32Array(this._buffer, this.byteOffset + this.position, length);
	DataStream.arrayToNative(arr, e == null ? this.endianness : e);
	this.position += length * 4;
	return arr;
};

/**
    Maps an Int16Array into the DataStream buffer, swizzling it to native
    endianness in-place. The current offset from the start of the buffer needs to
    be a multiple of element size, just like with typed array views.
  
    Nice for quickly reading in data. Warning: potentially modifies the buffer
    contents.
  
    @param {number} length Number of elements to map.
    @param {?boolean} e Endianness of the data to read.
    @return {Object} Int16Array to the DataStream backing buffer.
    */
DataStream.prototype.mapInt16Array = function (length, e) {
	this._realloc(length * 2);
	var arr = new Int16Array(this._buffer, this.byteOffset + this.position, length);
	DataStream.arrayToNative(arr, e == null ? this.endianness : e);
	this.position += length * 2;
	return arr;
};

/**
    Maps an Int8Array into the DataStream buffer.
  
    Nice for quickly reading in data.
  
    @param {number} length Number of elements to map.
    @param {?boolean} e Endianness of the data to read.
    @return {Object} Int8Array to the DataStream backing buffer.
    */
DataStream.prototype.mapInt8Array = function (length) {
	this._realloc(length * 1);
	var arr = new Int8Array(this._buffer, this.byteOffset + this.position, length);
	this.position += length * 1;
	return arr;
};

/**
    Maps a Uint32Array into the DataStream buffer, swizzling it to native
    endianness in-place. The current offset from the start of the buffer needs to
    be a multiple of element size, just like with typed array views.
  
    Nice for quickly reading in data. Warning: potentially modifies the buffer
    contents.
  
    @param {number} length Number of elements to map.
    @param {?boolean} e Endianness of the data to read.
    @return {Object} Uint32Array to the DataStream backing buffer.
    */
DataStream.prototype.mapUint32Array = function (length, e) {
	this._realloc(length * 4);
	var arr = new Uint32Array(this._buffer, this.byteOffset + this.position, length);
	DataStream.arrayToNative(arr, e == null ? this.endianness : e);
	this.position += length * 4;
	return arr;
};

/**
    Maps a Uint16Array into the DataStream buffer, swizzling it to native
    endianness in-place. The current offset from the start of the buffer needs to
    be a multiple of element size, just like with typed array views.
  
    Nice for quickly reading in data. Warning: potentially modifies the buffer
    contents.
  
    @param {number} length Number of elements to map.
    @param {?boolean} e Endianness of the data to read.
    @return {Object} Uint16Array to the DataStream backing buffer.
    */
DataStream.prototype.mapUint16Array = function (length, e) {
	this._realloc(length * 2);
	var arr = new Uint16Array(this._buffer, this.byteOffset + this.position, length);
	DataStream.arrayToNative(arr, e == null ? this.endianness : e);
	this.position += length * 2;
	return arr;
};

/**
    Maps a Uint8Array into the DataStream buffer.
  
    Nice for quickly reading in data.
  
    @param {number} length Number of elements to map.
    @param {?boolean} e Endianness of the data to read.
    @return {Object} Uint8Array to the DataStream backing buffer.
    */
DataStream.prototype.mapUint8Array = function (length) {
	this._realloc(length * 1);
	var arr = new Uint8Array(this._buffer, this.byteOffset + this.position, length);
	this.position += length * 1;
	return arr;
};

/**
    Maps a Float64Array into the DataStream buffer, swizzling it to native
    endianness in-place. The current offset from the start of the buffer needs to
    be a multiple of element size, just like with typed array views.
  
    Nice for quickly reading in data. Warning: potentially modifies the buffer
    contents.
  
    @param {number} length Number of elements to map.
    @param {?boolean} e Endianness of the data to read.
    @return {Object} Float64Array to the DataStream backing buffer.
    */
DataStream.prototype.mapFloat64Array = function (length, e) {
	this._realloc(length * 8);
	var arr = new Float64Array(this._buffer, this.byteOffset + this.position, length);
	DataStream.arrayToNative(arr, e == null ? this.endianness : e);
	this.position += length * 8;
	return arr;
};

/**
    Maps a Float32Array into the DataStream buffer, swizzling it to native
    endianness in-place. The current offset from the start of the buffer needs to
    be a multiple of element size, just like with typed array views.
  
    Nice for quickly reading in data. Warning: potentially modifies the buffer
    contents.
  
    @param {number} length Number of elements to map.
    @param {?boolean} e Endianness of the data to read.
    @return {Object} Float32Array to the DataStream backing buffer.
    */
DataStream.prototype.mapFloat32Array = function (length, e) {
	this._realloc(length * 4);
	var arr = new Float32Array(this._buffer, this.byteOffset + this.position, length);
	DataStream.arrayToNative(arr, e == null ? this.endianness : e);
	this.position += length * 4;
	return arr;
};

/**
    Reads an Int32Array of desired length and endianness from the DataStream.
  
    @param {number} length Number of elements to map.
    @param {?boolean} e Endianness of the data to read.
    @return {Object} The read Int32Array.
   */
DataStream.prototype.readInt32Array = function (length, e) {
	length = length == null ? this.byteLength - this.position / 4 : length;
	var arr = new Int32Array(length);
	DataStream.memcpy(arr.buffer, 0, this.buffer, this.byteOffset + this.position, length * arr.BYTES_PER_ELEMENT);
	DataStream.arrayToNative(arr, e == null ? this.endianness : e);
	this.position += arr.byteLength;
	return arr;
};

/**
    Reads an Int16Array of desired length and endianness from the DataStream.
  
    @param {number} length Number of elements to map.
    @param {?boolean} e Endianness of the data to read.
    @return {Object} The read Int16Array.
   */
DataStream.prototype.readInt16Array = function (length, e) {
	length = length == null ? this.byteLength - this.position / 2 : length;
	var arr = new Int16Array(length);
	DataStream.memcpy(arr.buffer, 0, this.buffer, this.byteOffset + this.position, length * arr.BYTES_PER_ELEMENT);
	DataStream.arrayToNative(arr, e == null ? this.endianness : e);
	this.position += arr.byteLength;
	return arr;
};

/**
    Reads an Int8Array of desired length from the DataStream.
  
    @param {number} length Number of elements to map.
    @param {?boolean} e Endianness of the data to read.
    @return {Object} The read Int8Array.
   */
DataStream.prototype.readInt8Array = function (length) {
	length = length == null ? this.byteLength - this.position : length;
	var arr = new Int8Array(length);
	DataStream.memcpy(arr.buffer, 0, this.buffer, this.byteOffset + this.position, length * arr.BYTES_PER_ELEMENT);
	this.position += arr.byteLength;
	return arr;
};

/**
    Reads a Uint32Array of desired length and endianness from the DataStream.
  
    @param {number} length Number of elements to map.
    @param {?boolean} e Endianness of the data to read.
    @return {Object} The read Uint32Array.
   */
DataStream.prototype.readUint32Array = function (length, e) {
	length = length == null ? this.byteLength - this.position / 4 : length;
	var arr = new Uint32Array(length);
	DataStream.memcpy(arr.buffer, 0, this.buffer, this.byteOffset + this.position, length * arr.BYTES_PER_ELEMENT);
	DataStream.arrayToNative(arr, e == null ? this.endianness : e);
	this.position += arr.byteLength;
	return arr;
};

/**
    Reads a Uint16Array of desired length and endianness from the DataStream.
  
    @param {number} length Number of elements to map.
    @param {?boolean} e Endianness of the data to read.
    @return {Object} The read Uint16Array.
   */
DataStream.prototype.readUint16Array = function (length, e) {
	length = length == null ? this.byteLength - this.position / 2 : length;
	var arr = new Uint16Array(length);
	DataStream.memcpy(arr.buffer, 0, this.buffer, this.byteOffset + this.position, length * arr.BYTES_PER_ELEMENT);
	DataStream.arrayToNative(arr, e == null ? this.endianness : e);
	this.position += arr.byteLength;
	return arr;
};

/**
    Reads a Uint8Array of desired length from the DataStream.
  
    @param {number} length Number of elements to map.
    @param {?boolean} e Endianness of the data to read.
    @return {Object} The read Uint8Array.
   */
DataStream.prototype.readUint8Array = function (length) {
	length = length == null ? this.byteLength - this.position : length;
	var arr = new Uint8Array(length);
	DataStream.memcpy(arr.buffer, 0, this.buffer, this.byteOffset + this.position, length * arr.BYTES_PER_ELEMENT);
	this.position += arr.byteLength;
	return arr;
};

/**
    Reads a Float64Array of desired length and endianness from the DataStream.
  
    @param {number} length Number of elements to map.
    @param {?boolean} e Endianness of the data to read.
    @return {Object} The read Float64Array.
   */
DataStream.prototype.readFloat64Array = function (length, e) {
	length = length == null ? this.byteLength - this.position / 8 : length;
	var arr = new Float64Array(length);
	DataStream.memcpy(arr.buffer, 0, this.buffer, this.byteOffset + this.position, length * arr.BYTES_PER_ELEMENT);
	DataStream.arrayToNative(arr, e == null ? this.endianness : e);
	this.position += arr.byteLength;
	return arr;
};

/**
    Reads a Float32Array of desired length and endianness from the DataStream.
  
    @param {number} length Number of elements to map.
    @param {?boolean} e Endianness of the data to read.
    @return {Object} The read Float32Array.
   */
DataStream.prototype.readFloat32Array = function (length, e) {
	length = length == null ? this.byteLength - this.position / 4 : length;
	var arr = new Float32Array(length);
	DataStream.memcpy(arr.buffer, 0, this.buffer, this.byteOffset + this.position, length * arr.BYTES_PER_ELEMENT);
	DataStream.arrayToNative(arr, e == null ? this.endianness : e);
	this.position += arr.byteLength;
	return arr;
};

/**
    Writes an Int32Array of specified endianness to the DataStream.
  
    @param {Object} arr The array to write.
    @param {?boolean} e Endianness of the data to write.
   */
DataStream.prototype.writeInt32Array = function (arr, e) {
	this._realloc(arr.length * 4);
	if (arr instanceof Int32Array && this.byteOffset + (this.position % arr.BYTES_PER_ELEMENT) == 0) {
		DataStream.memcpy(this._buffer, this.byteOffset + this.position, arr.buffer, 0, arr.byteLength);
		this.mapInt32Array(arr.length, e);
	} else {
		for (var i = 0; i < arr.length; i++) {
			this.writeInt32(arr[i], e);
		}
	}
};

/**
    Writes an Int16Array of specified endianness to the DataStream.
  
    @param {Object} arr The array to write.
    @param {?boolean} e Endianness of the data to write.
   */
DataStream.prototype.writeInt16Array = function (arr, e) {
	this._realloc(arr.length * 2);
	if (arr instanceof Int16Array && this.byteOffset + (this.position % arr.BYTES_PER_ELEMENT) == 0) {
		DataStream.memcpy(this._buffer, this.byteOffset + this.position, arr.buffer, 0, arr.byteLength);
		this.mapInt16Array(arr.length, e);
	} else {
		for (var i = 0; i < arr.length; i++) {
			this.writeInt16(arr[i], e);
		}
	}
};

/**
    Writes an Int8Array to the DataStream.
  
    @param {Object} arr The array to write.
   */
DataStream.prototype.writeInt8Array = function (arr) {
	this._realloc(arr.length * 1);
	if (arr instanceof Int8Array && this.byteOffset + (this.position % arr.BYTES_PER_ELEMENT) == 0) {
		DataStream.memcpy(this._buffer, this.byteOffset + this.position, arr.buffer, 0, arr.byteLength);
		this.mapInt8Array(arr.length);
	} else {
		for (var i = 0; i < arr.length; i++) {
			this.writeInt8(arr[i]);
		}
	}
};

/**
    Writes a Uint32Array of specified endianness to the DataStream.
  
    @param {Object} arr The array to write.
    @param {?boolean} e Endianness of the data to write.
   */
DataStream.prototype.writeUint32Array = function (arr, e) {
	this._realloc(arr.length * 4);
	if (arr instanceof Uint32Array && this.byteOffset + (this.position % arr.BYTES_PER_ELEMENT) == 0) {
		DataStream.memcpy(this._buffer, this.byteOffset + this.position, arr.buffer, 0, arr.byteLength);
		this.mapUint32Array(arr.length, e);
	} else {
		for (var i = 0; i < arr.length; i++) {
			this.writeUint32(arr[i], e);
		}
	}
};

/**
    Writes a Uint16Array of specified endianness to the DataStream.
  
    @param {Object} arr The array to write.
    @param {?boolean} e Endianness of the data to write.
   */
DataStream.prototype.writeUint16Array = function (arr, e) {
	this._realloc(arr.length * 2);
	if (arr instanceof Uint16Array && this.byteOffset + (this.position % arr.BYTES_PER_ELEMENT) == 0) {
		DataStream.memcpy(this._buffer, this.byteOffset + this.position, arr.buffer, 0, arr.byteLength);
		this.mapUint16Array(arr.length, e);
	} else {
		for (var i = 0; i < arr.length; i++) {
			this.writeUint16(arr[i], e);
		}
	}
};

/**
    Writes a Uint8Array to the DataStream.
  
    @param {Object} arr The array to write.
   */
DataStream.prototype.writeUint8Array = function (arr) {
	this._realloc(arr.length * 1);
	if (arr instanceof Uint8Array && this.byteOffset + (this.position % arr.BYTES_PER_ELEMENT) == 0) {
		DataStream.memcpy(this._buffer, this.byteOffset + this.position, arr.buffer, 0, arr.byteLength);
		this.mapUint8Array(arr.length);
	} else {
		for (var i = 0; i < arr.length; i++) {
			this.writeUint8(arr[i]);
		}
	}
};

/**
    Writes a Float64Array of specified endianness to the DataStream.
  
    @param {Object} arr The array to write.
    @param {?boolean} e Endianness of the data to write.
   */
DataStream.prototype.writeFloat64Array = function (arr, e) {
	this._realloc(arr.length * 8);
	if (arr instanceof Float64Array && this.byteOffset + (this.position % arr.BYTES_PER_ELEMENT) == 0) {
		DataStream.memcpy(this._buffer, this.byteOffset + this.position, arr.buffer, 0, arr.byteLength);
		this.mapFloat64Array(arr.length, e);
	} else {
		for (var i = 0; i < arr.length; i++) {
			this.writeFloat64(arr[i], e);
		}
	}
};

/**
    Writes a Float32Array of specified endianness to the DataStream.
  
    @param {Object} arr The array to write.
    @param {?boolean} e Endianness of the data to write.
   */
DataStream.prototype.writeFloat32Array = function (arr, e) {
	this._realloc(arr.length * 4);
	if (arr instanceof Float32Array && this.byteOffset + (this.position % arr.BYTES_PER_ELEMENT) == 0) {
		DataStream.memcpy(this._buffer, this.byteOffset + this.position, arr.buffer, 0, arr.byteLength);
		this.mapFloat32Array(arr.length, e);
	} else {
		for (var i = 0; i < arr.length; i++) {
			this.writeFloat32(arr[i], e);
		}
	}
};

/**
    Reads a 32-bit int from the DataStream with the desired endianness.
  
    @param {?boolean} e Endianness of the number.
    @return {number} The read number.
   */
DataStream.prototype.readInt32 = function (e) {
	var v = this._dataView.getInt32(this.position, e == null ? this.endianness : e);
	this.position += 4;
	return v;
};

/**
   Reads a 32-bit int from the DataStream with the offset.
  
   @param {number} offset The offset.
   @return {number} The read number.
   */
DataStream.prototype.readInt = function (offset) {
	this.seek(offset);
	return this.readInt32();
};

/**
    Reads a 16-bit int from the DataStream with the desired endianness.
  
    @param {?boolean} e Endianness of the number.
    @return {number} The read number.
   */
DataStream.prototype.readInt16 = function (e) {
	var v = this._dataView.getInt16(this.position, e == null ? this.endianness : e);
	this.position += 2;
	return v;
};

/**
   Reads a 16-bit int from the DataStream with the offset
  
   @param {number} offset The offset.
   @return {number} The read number.
   */
DataStream.prototype.readShort = function (offset) {
	this.seek(offset);
	return this.readInt16();
};

/**
    Reads an 8-bit int from the DataStream.
  
    @return {number} The read number.
   */
DataStream.prototype.readInt8 = function () {
	var v = this._dataView.getInt8(this.position);
	this.position += 1;
	return v;
};

/**
   Reads an 8-bit int from the DataStream with the offset.
  
   @param {number} offset The offset.
   @return {number} The read number.
   */
DataStream.prototype.readByte = function (offset) {
	this.seek(offset);
	return this.readInt8();
};

/**
    Reads a 32-bit unsigned int from the DataStream with the desired endianness.
  
    @param {?boolean} e Endianness of the number.
    @return {number} The read number.
   */
DataStream.prototype.readUint32 = function (e) {
	var v = this._dataView.getUint32(this.position, e == null ? this.endianness : e);
	this.position += 4;
	return v;
};

/**
    Reads a 16-bit unsigned int from the DataStream with the desired endianness.
  
    @param {?boolean} e Endianness of the number.
    @return {number} The read number.
   */
DataStream.prototype.readUint16 = function (e) {
	var v = this._dataView.getUint16(this.position, e == null ? this.endianness : e);
	this.position += 2;
	return v;
};

/**
    Reads an 8-bit unsigned int from the DataStream.
  
    @return {number} The read number.
   */
DataStream.prototype.readUint8 = function () {
	var v = this._dataView.getUint8(this.position);
	this.position += 1;
	return v;
};

/**
    Reads a 32-bit float from the DataStream with the desired endianness.
  
    @param {?boolean} e Endianness of the number.
    @return {number} The read number.
   */
DataStream.prototype.readFloat32 = function (e) {
	var v = this._dataView.getFloat32(this.position, e == null ? this.endianness : e);
	this.position += 4;
	return v;
};

/**
    Reads a 64-bit float from the DataStream with the desired endianness.
  
    @param {?boolean} e Endianness of the number.
    @return {number} The read number.
   */
DataStream.prototype.readFloat64 = function (e) {
	var v = this._dataView.getFloat64(this.position, e == null ? this.endianness : e);
	this.position += 8;
	return v;
};

/**
    Writes a 32-bit int to the DataStream with the desired endianness.
  
    @param {number} v Number to write.
    @param {?boolean} e Endianness of the number.
   */
DataStream.prototype.writeInt32 = function (v, e) {
	this._realloc(4);
	this._dataView.setInt32(this.position, v, e == null ? this.endianness : e);
	this.position += 4;
};

/**
    Writes a 16-bit int to the DataStream with the desired endianness.
  
    @param {number} v Number to write.
    @param {?boolean} e Endianness of the number.
   */
DataStream.prototype.writeInt16 = function (v, e) {
	this._realloc(2);
	this._dataView.setInt16(this.position, v, e == null ? this.endianness : e);
	this.position += 2;
};

/**
    Writes an 8-bit int to the DataStream.
  
    @param {number} v Number to write.
   */
DataStream.prototype.writeInt8 = function (v) {
	this._realloc(1);
	this._dataView.setInt8(this.position, v);
	this.position += 1;
};

/**
    Writes a 32-bit unsigned int to the DataStream with the desired endianness.
  
    @param {number} v Number to write.
    @param {?boolean} e Endianness of the number.
   */
DataStream.prototype.writeUint32 = function (v, e) {
	this._realloc(4);
	this._dataView.setUint32(this.position, v, e == null ? this.endianness : e);
	this.position += 4;
};

/**
    Writes a 16-bit unsigned int to the DataStream with the desired endianness.
  
    @param {number} v Number to write.
    @param {?boolean} e Endianness of the number.
   */
DataStream.prototype.writeUint16 = function (v, e) {
	this._realloc(2);
	this._dataView.setUint16(this.position, v, e == null ? this.endianness : e);
	this.position += 2;
};

/**
    Writes an 8-bit unsigned  int to the DataStream.
  
    @param {number} v Number to write.
   */
DataStream.prototype.writeUint8 = function (v) {
	this._realloc(1);
	this._dataView.setUint8(this.position, v);
	this.position += 1;
};

/**
    Writes a 32-bit float to the DataStream with the desired endianness.
  
    @param {number} v Number to write.
    @param {?boolean} e Endianness of the number.
   */
DataStream.prototype.writeFloat32 = function (v, e) {
	this._realloc(4);
	this._dataView.setFloat32(this.position, v, e == null ? this.endianness : e);
	this.position += 4;
};

/**
    Writes a 64-bit float to the DataStream with the desired endianness.
  
    @param {number} v Number to write.
    @param {?boolean} e Endianness of the number.
   */
DataStream.prototype.writeFloat64 = function (v, e) {
	this._realloc(8);
	this._dataView.setFloat64(this.position, v, e == null ? this.endianness : e);
	this.position += 8;
};

/**
    Native endianness. Either DataStream.BIG_ENDIAN or DataStream.LITTLE_ENDIAN
    depending on the platform endianness.
  
    @type {boolean}
   */
DataStream.endianness = new Int8Array(new Int16Array([1]).buffer)[0] > 0;

/**
    Copies byteLength bytes from the src buffer at srcOffset to the
    dst buffer at dstOffset.
  
    @param {Object} dst Destination ArrayBuffer to write to.
    @param {number} dstOffset Offset to the destination ArrayBuffer.
    @param {Object} src Source ArrayBuffer to read from.
    @param {number} srcOffset Offset to the source ArrayBuffer.
    @param {number} byteLength Number of bytes to copy.
   */
DataStream.memcpy = function (dst, dstOffset, src, srcOffset, byteLength) {
	var dstU8 = new Uint8Array(dst, dstOffset, byteLength);
	var srcU8 = new Uint8Array(src, srcOffset, byteLength);
	dstU8.set(srcU8);
};

/**
    Converts array to native endianness in-place.
  
    @param {Object} array Typed array to convert.
    @param {boolean} arrayIsLittleEndian True if the data in the array is
                                         little-endian. Set false for big-endian.
    @return {Object} The converted typed array.
   */
DataStream.arrayToNative = function (array, arrayIsLittleEndian) {
	if (arrayIsLittleEndian == this.endianness) {
		return array;
	} else {
		return this.flipArrayEndianness(array);
	}
};

/**
    Converts native endianness array to desired endianness in-place.
  
    @param {Object} array Typed array to convert.
    @param {boolean} littleEndian True if the converted array should be
                                  little-endian. Set false for big-endian.
    @return {Object} The converted typed array.
   */
DataStream.nativeToEndian = function (array, littleEndian) {
	if (this.endianness == littleEndian) {
		return array;
	} else {
		return this.flipArrayEndianness(array);
	}
};

/**
    Flips typed array endianness in-place.
  
    @param {Object} array Typed array to flip.
    @return {Object} The converted typed array.
   */
DataStream.flipArrayEndianness = function (array) {
	var u8 = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
	for (var i = 0; i < array.byteLength; i += array.BYTES_PER_ELEMENT) {
		for (var j = i + array.BYTES_PER_ELEMENT - 1, k = i; j > k; j--, k++) {
			var tmp = u8[k];
			u8[k] = u8[j];
			u8[j] = tmp;
		}
	}
	return array;
};

/**
    Creates an array from an array of character codes.
    Uses String.fromCharCode on the character codes and concats the results into a string.
  
    @param {array} array Array of character codes.
    @return {string} String created from the character codes.
  **/
DataStream.createStringFromArray = function (array) {
	var str = '';
	for (var i = 0; i < array.length; i++) {
		str += String.fromCharCode(array[i]);
	}
	return str;
};

/**
    Seek position where DataStream#readStruct ran into a problem.
    Useful for debugging struct parsing.
  
    @type {number}
   */
DataStream.prototype.failurePosition = 0;

/**
    Reads a struct of data from the DataStream. The struct is defined as
    a flat array of [name, type]-pairs. See the example below:
  
    ds.readStruct([
      'headerTag', 'uint32', // Uint32 in DataStream endianness.
      'headerTag2', 'uint32be', // Big-endian Uint32.
      'headerTag3', 'uint32le', // Little-endian Uint32.
      'array', ['[]', 'uint32', 16], // Uint32Array of length 16.
      'array2Length', 'uint32',
      'array2', ['[]', 'uint32', 'array2Length'] // Uint32Array of length array2Length
    ]);
  
    The possible values for the type are as follows:
  
    // Number types
  
    // Unsuffixed number types use DataStream endianness.
    // To explicitly specify endianness, suffix the type with
    // 'le' for little-endian or 'be' for big-endian,
    // e.g. 'int32be' for big-endian int32.
  
    'uint8' -- 8-bit unsigned int
    'uint16' -- 16-bit unsigned int
    'uint32' -- 32-bit unsigned int
    'int8' -- 8-bit int
    'int16' -- 16-bit int
    'int32' -- 32-bit int
    'float32' -- 32-bit float
    'float64' -- 64-bit float
  
    // String types
    'cstring' -- ASCII string terminated by a zero byte.
    'string:N' -- ASCII string of length N, where N is a literal integer.
    'string:variableName' -- ASCII string of length $variableName,
      where 'variableName' is a previously parsed number in the current struct.
    'string,CHARSET:N' -- String of byteLength N encoded with given CHARSET.
    'u16string:N' -- UCS-2 string of length N in DataStream endianness.
    'u16stringle:N' -- UCS-2 string of length N in little-endian.
    'u16stringbe:N' -- UCS-2 string of length N in big-endian.
  
    // Complex types
    [name, type, name_2, type_2, ..., name_N, type_N] -- Struct
    function(dataStream, struct) {} -- Callback function to read and return data.
    {get: function(dataStream, struct) {},
     set: function(dataStream, struct) {}}
    -- Getter/setter functions to read and return data, handy for using the same
       struct definition for reading and writing structs.
    ['[]', type, length] -- Array of given type and length. The length can be either
                          a number, a string that references a previously-read
                          field, or a callback function(struct, dataStream, type){}.
                          If length is '*', reads in as many elements as it can.
  
    @param {Object} structDefinition Struct definition object.
    @return {Object} The read struct. Null if failed to read struct.
   */
DataStream.prototype.readStruct = function (structDefinition) {
	var struct = {},
		t,
		v,
		n;
	var p = this.position;
	for (var i = 0; i < structDefinition.length; i += 2) {
		t = structDefinition[i + 1];
		v = this.readType(t, struct);
		if (v == null) {
			if (this.failurePosition == 0) {
				this.failurePosition = this.position;
			}
			this.position = p;
			return null;
		}
		struct[structDefinition[i]] = v;
	}
	return struct;
};

/**
    Read UCS-2 string of desired length and endianness from the DataStream.
  
    @param {number} length The length of the string to read.
    @param {boolean} endianness The endianness of the string data in the DataStream.
    @return {string} The read string.
   */
DataStream.prototype.readUCS2String = function (length, endianness) {
	return DataStream.createStringFromArray(this.readUint16Array(length, endianness));
};

/**
   Read UCS-2 string of desired length and offset from the DataStream.
  
   @param {number} offset The offset.
   @param {number} length The length of the string to read.
   @return {string} The read string.
   */
DataStream.prototype.readStringAt = function (offset, length) {
	this.seek(offset);
	return this.readUCS2String(length);
};

/**
    Write a UCS-2 string of desired endianness to the DataStream. The
    lengthOverride argument lets you define the number of characters to write.
    If the string is shorter than lengthOverride, the extra space is padded with
    zeroes.
  
    @param {string} str The string to write.
    @param {?boolean} endianness The endianness to use for the written string data.
    @param {?number} lengthOverride The number of characters to write.
   */
DataStream.prototype.writeUCS2String = function (str, endianness, lengthOverride) {
	if (lengthOverride == null) {
		lengthOverride = str.length;
	}
	for (var i = 0; i < str.length && i < lengthOverride; i++) {
		this.writeUint16(str.charCodeAt(i), endianness);
	}
	for (; i < lengthOverride; i++) {
		this.writeUint16(0);
	}
};

/**
    Read a string of desired length and encoding from the DataStream.
  
    @param {number} length The length of the string to read in bytes.
    @param {?string} encoding The encoding of the string data in the DataStream.
                              Defaults to ASCII.
    @return {string} The read string.
   */
DataStream.prototype.readString = function (length, encoding) {
	if (encoding == null || encoding == 'ASCII') {
		return DataStream.createStringFromArray(
			this.mapUint8Array(length == null ? this.byteLength - this.position : length)
		);
	} else {
		return new TextDecoder(encoding).decode(this.mapUint8Array(length));
	}
};

/**
    Writes a string of desired length and encoding to the DataStream.
  
    @param {string} s The string to write.
    @param {?string} encoding The encoding for the written string data.
                              Defaults to ASCII.
    @param {?number} length The number of characters to write.
   */
DataStream.prototype.writeString = function (s, encoding, length) {
	if (encoding == null || encoding == 'ASCII') {
		if (length != null) {
			var i = 0;
			var len = Math.min(s.length, length);
			for (i = 0; i < len; i++) {
				this.writeUint8(s.charCodeAt(i));
			}
			for (; i < length; i++) {
				this.writeUint8(0);
			}
		} else {
			for (var i = 0; i < s.length; i++) {
				this.writeUint8(s.charCodeAt(i));
			}
		}
	} else {
		this.writeUint8Array(new TextEncoder(encoding).encode(s.substring(0, length)));
	}
};

/**
    Read null-terminated string of desired length from the DataStream. Truncates
    the returned string so that the null byte is not a part of it.
  
    @param {?number} length The length of the string to read.
    @return {string} The read string.
   */
DataStream.prototype.readCString = function (length) {
	var blen = this.byteLength - this.position;
	var u8 = new Uint8Array(this._buffer, this._byteOffset + this.position);
	var len = blen;
	if (length != null) {
		len = Math.min(length, blen);
	}
	for (var i = 0; i < len && u8[i] != 0; i++); // find first zero byte
	var s = DataStream.createStringFromArray(this.mapUint8Array(i));
	if (length != null) {
		this.position += len - i;
	} else if (i != blen) {
		this.position += 1; // trailing zero if not at end of buffer
	}
	return s;
};

/**
    Writes a null-terminated string to DataStream and zero-pads it to length
    bytes. If length is not given, writes the string followed by a zero.
    If string is longer than length, the written part of the string does not have
    a trailing zero.
  
    @param {string} s The string to write.
    @param {?number} length The number of characters to write.
   */
DataStream.prototype.writeCString = function (s, length) {
	if (length != null) {
		var i = 0;
		var len = Math.min(s.length, length);
		for (i = 0; i < len; i++) {
			this.writeUint8(s.charCodeAt(i));
		}
		for (; i < length; i++) {
			this.writeUint8(0);
		}
	} else {
		for (var i = 0; i < s.length; i++) {
			this.writeUint8(s.charCodeAt(i));
		}
		this.writeUint8(0);
	}
};

/**
    Reads an object of type t from the DataStream, passing struct as the thus-far
    read struct to possible callbacks that refer to it. Used by readStruct for
    reading in the values, so the type is one of the readStruct types.
  
    @param {Object} t Type of the object to read.
    @param {?Object} struct Struct to refer to when resolving length references
                            and for calling callbacks.
    @return {?Object} Returns the object on successful read, null on unsuccessful.
   */
DataStream.prototype.readType = function (t, struct) {
	if (typeof t == 'function') {
		return t(this, struct);
	} else if (typeof t == 'object' && !(t instanceof Array)) {
		return t.get(this, struct);
	} else if (t instanceof Array && t.length != 3) {
		return this.readStruct(t, struct);
	}
	var v = null;
	var lengthOverride = null;
	var charset = 'ASCII';
	var pos = this.position;
	var len;
	if (typeof t == 'string' && /:/.test(t)) {
		var tp = t.split(':');
		t = tp[0];
		len = tp[1];

		// allow length to be previously parsed variable
		// e.g. 'string:fieldLength', if `fieldLength` has
		// been parsed previously.
		if (struct[len] != null) {
			lengthOverride = parseInt(struct[len]);
		} else {
			// assume literal integer e.g., 'string:4'
			lengthOverride = parseInt(tp[1]);
		}
	}
	if (typeof t == 'string' && /,/.test(t)) {
		var tp = t.split(',');
		t = tp[0];
		charset = parseInt(tp[1]);
	}
	switch (t) {
		case 'uint8':
			v = this.readUint8();
			break;
		case 'int8':
			v = this.readInt8();
			break;

		case 'uint16':
			v = this.readUint16(this.endianness);
			break;
		case 'int16':
			v = this.readInt16(this.endianness);
			break;
		case 'uint32':
			v = this.readUint32(this.endianness);
			break;
		case 'int32':
			v = this.readInt32(this.endianness);
			break;
		case 'float32':
			v = this.readFloat32(this.endianness);
			break;
		case 'float64':
			v = this.readFloat64(this.endianness);
			break;

		case 'uint16be':
			v = this.readUint16(DataStream.BIG_ENDIAN);
			break;
		case 'int16be':
			v = this.readInt16(DataStream.BIG_ENDIAN);
			break;
		case 'uint32be':
			v = this.readUint32(DataStream.BIG_ENDIAN);
			break;
		case 'int32be':
			v = this.readInt32(DataStream.BIG_ENDIAN);
			break;
		case 'float32be':
			v = this.readFloat32(DataStream.BIG_ENDIAN);
			break;
		case 'float64be':
			v = this.readFloat64(DataStream.BIG_ENDIAN);
			break;

		case 'uint16le':
			v = this.readUint16(DataStream.LITTLE_ENDIAN);
			break;
		case 'int16le':
			v = this.readInt16(DataStream.LITTLE_ENDIAN);
			break;
		case 'uint32le':
			v = this.readUint32(DataStream.LITTLE_ENDIAN);
			break;
		case 'int32le':
			v = this.readInt32(DataStream.LITTLE_ENDIAN);
			break;
		case 'float32le':
			v = this.readFloat32(DataStream.LITTLE_ENDIAN);
			break;
		case 'float64le':
			v = this.readFloat64(DataStream.LITTLE_ENDIAN);
			break;

		case 'cstring':
			v = this.readCString(lengthOverride);
			break;

		case 'string':
			v = this.readString(lengthOverride, charset);
			break;

		case 'u16string':
			v = this.readUCS2String(lengthOverride, this.endianness);
			break;

		case 'u16stringle':
			v = this.readUCS2String(lengthOverride, DataStream.LITTLE_ENDIAN);
			break;

		case 'u16stringbe':
			v = this.readUCS2String(lengthOverride, DataStream.BIG_ENDIAN);
			break;

		default:
			if (t.length == 3) {
				var ta = t[1];
				var len = t[2];
				var length = 0;
				if (typeof len == 'function') {
					length = len(struct, this, t);
				} else if (typeof len == 'string' && struct[len] != null) {
					length = parseInt(struct[len]);
				} else {
					length = parseInt(len);
				}
				if (typeof ta == 'string') {
					var tap = ta.replace(/(le|be)$/, '');
					var endianness = null;
					if (/le$/.test(ta)) {
						endianness = DataStream.LITTLE_ENDIAN;
					} else if (/be$/.test(ta)) {
						endianness = DataStream.BIG_ENDIAN;
					}
					if (len == '*') {
						length = null;
					}
					switch (tap) {
						case 'uint8':
							v = this.readUint8Array(length);
							break;
						case 'uint16':
							v = this.readUint16Array(length, endianness);
							break;
						case 'uint32':
							v = this.readUint32Array(length, endianness);
							break;
						case 'int8':
							v = this.readInt8Array(length);
							break;
						case 'int16':
							v = this.readInt16Array(length, endianness);
							break;
						case 'int32':
							v = this.readInt32Array(length, endianness);
							break;
						case 'float32':
							v = this.readFloat32Array(length, endianness);
							break;
						case 'float64':
							v = this.readFloat64Array(length, endianness);
							break;
						case 'cstring':
						case 'utf16string':
						case 'string':
							if (length == null) {
								v = [];
								while (!this.isEof()) {
									var u = this.readType(ta, struct);
									if (u == null) break;
									v.push(u);
								}
							} else {
								v = new Array(length);
								for (var i = 0; i < length; i++) {
									v[i] = this.readType(ta, struct);
								}
							}
							break;
					}
				} else {
					if (len == '*') {
						v = [];
						this.buffer;
						while (true) {
							var p = this.position;
							try {
								var o = this.readType(ta, struct);
								if (o == null) {
									this.position = p;
									break;
								}
								v.push(o);
							} catch (e) {
								this.position = p;
								break;
							}
						}
					} else {
						v = new Array(length);
						for (var i = 0; i < length; i++) {
							var u = this.readType(ta, struct);
							if (u == null) return null;
							v[i] = u;
						}
					}
				}
				break;
			}
	}
	if (lengthOverride != null) {
		this.position = pos + lengthOverride;
	}
	return v;
};

/**
    Writes a struct to the DataStream. Takes a structDefinition that gives the
    types and a struct object that gives the values. Refer to readStruct for the
    structure of structDefinition.
  
    @param {Object} structDefinition Type definition of the struct.
    @param {Object} struct The struct data object.
    */
DataStream.prototype.writeStruct = function (structDefinition, struct) {
	for (var i = 0; i < structDefinition.length; i += 2) {
		var t = structDefinition[i + 1];
		this.writeType(t, struct[structDefinition[i]], struct);
	}
};

/**
    Writes object v of type t to the DataStream.
  
    @param {Object} t Type of data to write.
    @param {Object} v Value of data to write.
    @param {Object} struct Struct to pass to write callback functions.
    */
DataStream.prototype.writeType = function (t, v, struct) {
	if (typeof t == 'function') {
		return t(this, v);
	} else if (typeof t == 'object' && !(t instanceof Array)) {
		return t.set(this, v, struct);
	}
	var lengthOverride = null;
	var charset = 'ASCII';
	var pos = this.position;
	if (typeof t == 'string' && /:/.test(t)) {
		var tp = t.split(':');
		t = tp[0];
		lengthOverride = parseInt(tp[1]);
	}
	if (typeof t == 'string' && /,/.test(t)) {
		var tp = t.split(',');
		t = tp[0];
		charset = parseInt(tp[1]);
	}

	switch (t) {
		case 'uint8':
			this.writeUint8(v);
			break;
		case 'int8':
			this.writeInt8(v);
			break;

		case 'uint16':
			this.writeUint16(v, this.endianness);
			break;
		case 'int16':
			this.writeInt16(v, this.endianness);
			break;
		case 'uint32':
			this.writeUint32(v, this.endianness);
			break;
		case 'int32':
			this.writeInt32(v, this.endianness);
			break;
		case 'float32':
			this.writeFloat32(v, this.endianness);
			break;
		case 'float64':
			this.writeFloat64(v, this.endianness);
			break;

		case 'uint16be':
			this.writeUint16(v, DataStream.BIG_ENDIAN);
			break;
		case 'int16be':
			this.writeInt16(v, DataStream.BIG_ENDIAN);
			break;
		case 'uint32be':
			this.writeUint32(v, DataStream.BIG_ENDIAN);
			break;
		case 'int32be':
			this.writeInt32(v, DataStream.BIG_ENDIAN);
			break;
		case 'float32be':
			this.writeFloat32(v, DataStream.BIG_ENDIAN);
			break;
		case 'float64be':
			this.writeFloat64(v, DataStream.BIG_ENDIAN);
			break;

		case 'uint16le':
			this.writeUint16(v, DataStream.LITTLE_ENDIAN);
			break;
		case 'int16le':
			this.writeInt16(v, DataStream.LITTLE_ENDIAN);
			break;
		case 'uint32le':
			this.writeUint32(v, DataStream.LITTLE_ENDIAN);
			break;
		case 'int32le':
			this.writeInt32(v, DataStream.LITTLE_ENDIAN);
			break;
		case 'float32le':
			this.writeFloat32(v, DataStream.LITTLE_ENDIAN);
			break;
		case 'float64le':
			this.writeFloat64(v, DataStream.LITTLE_ENDIAN);
			break;

		case 'cstring':
			this.writeCString(v, lengthOverride);
			break;

		case 'string':
			this.writeString(v, charset, lengthOverride);
			break;

		case 'u16string':
			this.writeUCS2String(v, this.endianness, lengthOverride);
			break;

		case 'u16stringle':
			this.writeUCS2String(v, DataStream.LITTLE_ENDIAN, lengthOverride);
			break;

		case 'u16stringbe':
			this.writeUCS2String(v, DataStream.BIG_ENDIAN, lengthOverride);
			break;

		default:
			if (t.length == 3) {
				var ta = t[1];
				for (var i = 0; i < v.length; i++) {
					this.writeType(ta, v[i]);
				}
				break;
			} else {
				this.writeStruct(t, v);
				break;
			}
	}
	if (lengthOverride != null) {
		this.position = pos;
		this._realloc(lengthOverride);
		this.position = pos + lengthOverride;
	}
};

// Export DataStream for amd environments
if (typeof define === 'function' && define.amd) {
	define('DataStream', [], function () {
		return DataStream;
	});
}

/* -----------------------------------------------m*/

// constants
var CONST = {
	FILE_HEADER: uInt2int([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
	MSG: {
		UNUSED_BLOCK: -1,
		END_OF_CHAIN: -2,

		S_BIG_BLOCK_SIZE: 0x0200,
		S_BIG_BLOCK_MARK: 9,

		L_BIG_BLOCK_SIZE: 0x1000,
		L_BIG_BLOCK_MARK: 12,

		SMALL_BLOCK_SIZE: 0x0040,
		BIG_BLOCK_MIN_DOC_SIZE: 0x1000,
		HEADER: {
			PROPERTY_START_OFFSET: 0x30,

			BAT_START_OFFSET: 0x4c,
			BAT_COUNT_OFFSET: 0x2c,

			SBAT_START_OFFSET: 0x3c,
			SBAT_COUNT_OFFSET: 0x40,

			XBAT_START_OFFSET: 0x44,
			XBAT_COUNT_OFFSET: 0x48,
		},
		PROP: {
			NO_INDEX: -1,
			PROPERTY_SIZE: 0x0080,

			NAME_SIZE_OFFSET: 0x40,
			MAX_NAME_LENGTH: /*NAME_SIZE_OFFSET*/ 0x40 / 2 - 1,
			TYPE_OFFSET: 0x42,
			PREVIOUS_PROPERTY_OFFSET: 0x44,
			NEXT_PROPERTY_OFFSET: 0x48,
			CHILD_PROPERTY_OFFSET: 0x4c,
			START_BLOCK_OFFSET: 0x74,
			SIZE_OFFSET: 0x78,
			TYPE_ENUM: {
				DIRECTORY: 1,
				DOCUMENT: 2,
				ROOT: 5,
			},
		},
		FIELD: {
			PREFIX: {
				ATTACHMENT: '__attach_version1.0',
				RECIPIENT: '__recip_version1.0',
				DOCUMENT: '__substg1.',
			},
			// example (use fields as needed)
			NAME_MAPPING: {
				// email specific
				'0037': 'subject',
				'0c1a': 'senderName',
				'5d02': 'senderEmail',
				1000: 'body',
				1013: 'bodyHTML',
				'007d': 'headers',
				// attachment specific
				3703: 'extension',
				3704: 'fileNameShort',
				3707: 'fileName',
				3712: 'pidContentId',
				'370e': 'mimeType',
				// recipient specific
				3001: 'name',
				'39fe': 'email',
			},
			CLASS_MAPPING: {
				ATTACHMENT_DATA: '3701',
			},
			TYPE_MAPPING: {
				'001e': 'string',
				'001f': 'unicode',
				'0102': 'binary',
			},
			DIR_TYPE: {
				INNER_MSG: '000d',
			},
		},
	},
};

// unit utils
function arraysEqual(a, b) {
	if (a === b) return true;
	if (a == null || b == null) return false;
	if (a.length != b.length) return false;

	for (var i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
}

function uInt2int(data) {
	var result = new Array(data.length);
	for (var i = 0; i < data.length; i++) {
		result[i] = (data[i] << 24) >> 24;
	}
	return result;
}

// MSG Reader implementation

// check MSG file header
function isMSGFile(ds) {
	ds.seek(0);
	return arraysEqual(CONST.FILE_HEADER, ds.readInt8Array(CONST.FILE_HEADER.length));
}

// FAT utils
function getBlockOffsetAt(msgData, offset) {
	return (offset + 1) * msgData.bigBlockSize;
}

function getBlockAt(ds, msgData, offset) {
	var startOffset = getBlockOffsetAt(msgData, offset);
	ds.seek(startOffset);
	return ds.readInt32Array(msgData.bigBlockLength);
}

function getNextBlockInner(ds, msgData, offset, blockOffsetData) {
	var currentBlock = Math.floor(offset / msgData.bigBlockLength);
	var currentBlockIndex = offset % msgData.bigBlockLength;

	var startBlockOffset = blockOffsetData[currentBlock];

	return getBlockAt(ds, msgData, startBlockOffset)[currentBlockIndex];
}

function getNextBlock(ds, msgData, offset) {
	return getNextBlockInner(ds, msgData, offset, msgData.batData);
}

function getNextBlockSmall(ds, msgData, offset) {
	return getNextBlockInner(ds, msgData, offset, msgData.sbatData);
}

// convert binary data to dictionary
function parseMsgData(ds) {
	var msgData = headerData(ds);
	msgData.batData = batData(ds, msgData);
	msgData.sbatData = sbatData(ds, msgData);
	if (msgData.xbatCount > 0) {
		xbatData(ds, msgData);
	}
	msgData.propertyData = propertyData(ds, msgData);
	msgData.fieldsData = fieldsData(ds, msgData);

	return msgData;
}

// extract header data
function headerData(ds) {
	var headerData = {};

	// system data
	headerData.bigBlockSize =
		ds.readByte(/*const position*/ 30) == CONST.MSG.L_BIG_BLOCK_MARK
			? CONST.MSG.L_BIG_BLOCK_SIZE
			: CONST.MSG.S_BIG_BLOCK_SIZE;
	headerData.bigBlockLength = headerData.bigBlockSize / 4;
	headerData.xBlockLength = headerData.bigBlockLength - 1;

	// header data
	headerData.batCount = ds.readInt(CONST.MSG.HEADER.BAT_COUNT_OFFSET);
	headerData.propertyStart = ds.readInt(CONST.MSG.HEADER.PROPERTY_START_OFFSET);
	headerData.sbatStart = ds.readInt(CONST.MSG.HEADER.SBAT_START_OFFSET);
	headerData.sbatCount = ds.readInt(CONST.MSG.HEADER.SBAT_COUNT_OFFSET);
	headerData.xbatStart = ds.readInt(CONST.MSG.HEADER.XBAT_START_OFFSET);
	headerData.xbatCount = ds.readInt(CONST.MSG.HEADER.XBAT_COUNT_OFFSET);

	return headerData;
}

function batCountInHeader(msgData) {
	var maxBatsInHeader = (CONST.MSG.S_BIG_BLOCK_SIZE - CONST.MSG.HEADER.BAT_START_OFFSET) / 4;
	return Math.min(msgData.batCount, maxBatsInHeader);
}

function batData(ds, msgData) {
	var result = new Array(batCountInHeader(msgData));
	ds.seek(CONST.MSG.HEADER.BAT_START_OFFSET);
	for (var i = 0; i < result.length; i++) {
		result[i] = ds.readInt32();
	}
	return result;
}

function sbatData(ds, msgData) {
	var result = [];
	var startIndex = msgData.sbatStart;

	for (var i = 0; i < msgData.sbatCount && startIndex != CONST.MSG.END_OF_CHAIN; i++) {
		result.push(startIndex);
		startIndex = getNextBlock(ds, msgData, startIndex);
	}
	return result;
}

function xbatData(ds, msgData) {
	var batCount = batCountInHeader(msgData);
	var batCountTotal = msgData.batCount;
	var remainingBlocks = batCountTotal - batCount;

	var nextBlockAt = msgData.xbatStart;
	for (var i = 0; i < msgData.xbatCount; i++) {
		var xBatBlock = getBlockAt(ds, msgData, nextBlockAt);
		nextBlockAt = xBatBlock[msgData.xBlockLength];

		var blocksToProcess = Math.min(remainingBlocks, msgData.xBlockLength);
		for (var j = 0; j < blocksToProcess; j++) {
			var blockStartAt = xBatBlock[j];
			if (blockStartAt == CONST.MSG.UNUSED_BLOCK || blockStartAt == CONST.MSG.END_OF_CHAIN) {
				break;
			}
			msgData.batData.push(blockStartAt);
		}
		remainingBlocks -= blocksToProcess;
	}
}

// extract property data and property hierarchy
function propertyData(ds, msgData) {
	var props = [];

	var currentOffset = msgData.propertyStart;

	while (currentOffset != CONST.MSG.END_OF_CHAIN) {
		convertBlockToProperties(ds, msgData, currentOffset, props);
		currentOffset = getNextBlock(ds, msgData, currentOffset);
	}
	createPropertyHierarchy(props, /*property with index 0 (zero) always as root*/ props[0]);
	return props;
}

function convertName(ds, offset) {
	var nameLength = ds.readShort(offset + CONST.MSG.PROP.NAME_SIZE_OFFSET);
	if (nameLength < 1) {
		return '';
	} else {
		return ds.readStringAt(offset, nameLength / 2);
	}
}

function convertProperty(ds, index, offset) {
	return {
		index: index,
		type: ds.readByte(offset + CONST.MSG.PROP.TYPE_OFFSET),
		name: convertName(ds, offset),
		// hierarchy
		previousProperty: ds.readInt(offset + CONST.MSG.PROP.PREVIOUS_PROPERTY_OFFSET),
		nextProperty: ds.readInt(offset + CONST.MSG.PROP.NEXT_PROPERTY_OFFSET),
		childProperty: ds.readInt(offset + CONST.MSG.PROP.CHILD_PROPERTY_OFFSET),
		// data offset
		startBlock: ds.readInt(offset + CONST.MSG.PROP.START_BLOCK_OFFSET),
		sizeBlock: ds.readInt(offset + CONST.MSG.PROP.SIZE_OFFSET),
	};
}

function convertBlockToProperties(ds, msgData, propertyBlockOffset, props) {
	var propertyCount = msgData.bigBlockSize / CONST.MSG.PROP.PROPERTY_SIZE;
	var propertyOffset = getBlockOffsetAt(msgData, propertyBlockOffset);

	for (var i = 0; i < propertyCount; i++) {
		var propertyType = ds.readByte(propertyOffset + CONST.MSG.PROP.TYPE_OFFSET);
		switch (propertyType) {
			case CONST.MSG.PROP.TYPE_ENUM.ROOT:
			case CONST.MSG.PROP.TYPE_ENUM.DIRECTORY:
			case CONST.MSG.PROP.TYPE_ENUM.DOCUMENT:
				props.push(convertProperty(ds, props.length, propertyOffset));
				break;
			default:
				/* unknown property types */
				props.push(null);
		}

		propertyOffset += CONST.MSG.PROP.PROPERTY_SIZE;
	}
}

function createPropertyHierarchy(props, nodeProperty) {
	if (nodeProperty.childProperty == CONST.MSG.PROP.NO_INDEX) {
		return;
	}
	nodeProperty.children = [];

	var children = [nodeProperty.childProperty];
	while (children.length != 0) {
		var currentIndex = children.shift();
		var current = props[currentIndex];
		if (current == null) {
			continue;
		}
		nodeProperty.children.push(currentIndex);

		if (current.type == CONST.MSG.PROP.TYPE_ENUM.DIRECTORY) {
			createPropertyHierarchy(props, current);
		}
		if (current.previousProperty != CONST.MSG.PROP.NO_INDEX) {
			children.push(current.previousProperty);
		}
		if (current.nextProperty != CONST.MSG.PROP.NO_INDEX) {
			children.push(current.nextProperty);
		}
	}
}

// extract real fields
function fieldsData(ds, msgData) {
	var fields = {
		attachments: [],
		recipients: [],
	};
	fieldsDataDir(ds, msgData, msgData.propertyData[0], fields);
	return fields;
}

function fieldsDataDir(ds, msgData, dirProperty, fields) {
	if (dirProperty.children && dirProperty.children.length > 0) {
		for (var i = 0; i < dirProperty.children.length; i++) {
			var childProperty = msgData.propertyData[dirProperty.children[i]];

			if (childProperty.type == CONST.MSG.PROP.TYPE_ENUM.DIRECTORY) {
				fieldsDataDirInner(ds, msgData, childProperty, fields);
			} else if (
				childProperty.type == CONST.MSG.PROP.TYPE_ENUM.DOCUMENT &&
				childProperty.name.indexOf(CONST.MSG.FIELD.PREFIX.DOCUMENT) == 0
			) {
				fieldsDataDocument(ds, msgData, childProperty, fields);
			}
		}
	}
}

function fieldsDataDirInner(ds, msgData, dirProperty, fields) {
	if (dirProperty.name.indexOf(CONST.MSG.FIELD.PREFIX.ATTACHMENT) == 0) {
		// attachment
		var attachmentField = {};
		fields.attachments.push(attachmentField);
		fieldsDataDir(ds, msgData, dirProperty, attachmentField);
	} else if (dirProperty.name.indexOf(CONST.MSG.FIELD.PREFIX.RECIPIENT) == 0) {
		// recipient
		var recipientField = {};
		fields.recipients.push(recipientField);
		fieldsDataDir(ds, msgData, dirProperty, recipientField);
	} else {
		// other dir
		var childFieldType = getFieldType(dirProperty);
		if (childFieldType != CONST.MSG.FIELD.DIR_TYPE.INNER_MSG) {
			fieldsDataDir(ds, msgData, dirProperty, fields);
		} else {
			// MSG as attachment currently isn't supported
			fields.innerMsgContent = true;
		}
	}
}

function isAddPropertyValue(fieldName, fieldTypeMapped) {
	return fieldName !== 'body' || fieldTypeMapped !== 'binary';
}

function fieldsDataDocument(ds, msgData, documentProperty, fields) {
	var value = documentProperty.name.substring(12).toLowerCase();
	var fieldClass = value.substring(0, 4);
	var fieldType = value.substring(4, 8);

	var fieldName = CONST.MSG.FIELD.NAME_MAPPING[fieldClass];
	var fieldTypeMapped = CONST.MSG.FIELD.TYPE_MAPPING[fieldType];

	if (fieldName) {
		var fieldValue = getFieldValue(ds, msgData, documentProperty, fieldTypeMapped);

		if (isAddPropertyValue(fieldName, fieldTypeMapped)) {
			fields[fieldName] = applyValueConverter(fieldName, fieldTypeMapped, fieldValue);
		}
	}
	if (fieldClass == CONST.MSG.FIELD.CLASS_MAPPING.ATTACHMENT_DATA) {
		// attachment specific info
		fields['dataId'] = documentProperty.index;
		fields['contentLength'] = documentProperty.sizeBlock;
	}
}

// todo: html body test
function applyValueConverter(fieldName, fieldTypeMapped, fieldValue) {
	if (fieldTypeMapped === 'binary' && fieldName === 'bodyHTML') {
		return convertUint8ArrayToString(fieldValue);
	}
	return fieldValue;
}

function getFieldType(fieldProperty) {
	var value = fieldProperty.name.substring(12).toLowerCase();
	return value.substring(4, 8);
}

// extractor structure to manage bat/sbat block types and different data types
var extractorFieldValue = {
	sbat: {
		extractor: function extractDataViaSbat(ds, msgData, fieldProperty, dataTypeExtractor) {
			var chain = getChainByBlockSmall(ds, msgData, fieldProperty);
			if (chain.length == 1) {
				return readDataByBlockSmall(
					ds,
					msgData,
					fieldProperty.startBlock,
					fieldProperty.sizeBlock,
					dataTypeExtractor
				);
			} else if (chain.length > 1) {
				return readChainDataByBlockSmall(ds, msgData, fieldProperty, chain, dataTypeExtractor);
			}
			return null;
		},
		dataType: {
			string: function extractBatString(ds, msgData, blockStartOffset, bigBlockOffset, blockSize) {
				ds.seek(blockStartOffset + bigBlockOffset);
				return ds.readString(blockSize);
			},
			unicode: function extractBatUnicode(ds, msgData, blockStartOffset, bigBlockOffset, blockSize) {
				ds.seek(blockStartOffset + bigBlockOffset);
				return ds.readUCS2String(blockSize / 2);
			},
			binary: function extractBatBinary(ds, msgData, blockStartOffset, bigBlockOffset, blockSize) {
				ds.seek(blockStartOffset + bigBlockOffset);
				return ds.readUint8Array(blockSize);
			},
		},
	},
	bat: {
		extractor: function extractDataViaBat(ds, msgData, fieldProperty, dataTypeExtractor) {
			var offset = getBlockOffsetAt(msgData, fieldProperty.startBlock);
			ds.seek(offset);
			return dataTypeExtractor(ds, fieldProperty);
		},
		dataType: {
			string: function extractSbatString(ds, fieldProperty) {
				return ds.readString(fieldProperty.sizeBlock);
			},
			unicode: function extractSbatUnicode(ds, fieldProperty) {
				return ds.readUCS2String(fieldProperty.sizeBlock / 2);
			},
			binary: function extractSbatBinary(ds, fieldProperty) {
				return ds.readUint8Array(fieldProperty.sizeBlock);
			},
		},
	},
};

function readDataByBlockSmall(ds, msgData, startBlock, blockSize, dataTypeExtractor) {
	var byteOffset = startBlock * CONST.MSG.SMALL_BLOCK_SIZE;
	var bigBlockNumber = Math.floor(byteOffset / msgData.bigBlockSize);
	var bigBlockOffset = byteOffset % msgData.bigBlockSize;

	var rootProp = msgData.propertyData[0];

	var nextBlock = rootProp.startBlock;
	for (var i = 0; i < bigBlockNumber; i++) {
		nextBlock = getNextBlock(ds, msgData, nextBlock);
	}
	var blockStartOffset = getBlockOffsetAt(msgData, nextBlock);

	return dataTypeExtractor(ds, msgData, blockStartOffset, bigBlockOffset, blockSize);
}

function readChainDataByBlockSmall(ds, msgData, fieldProperty, chain, dataTypeExtractor) {
	var resultData = new Int8Array(fieldProperty.sizeBlock);

	for (var i = 0, idx = 0; i < chain.length; i++) {
		var data = readDataByBlockSmall(
			ds,
			msgData,
			chain[i],
			CONST.MSG.SMALL_BLOCK_SIZE,
			extractorFieldValue.sbat.dataType.binary
		);
		for (var j = 0; j < data.length; j++) {
			resultData[idx++] = data[j];
		}
	}
	var localDs = new DataStream(resultData, 0, DataStream.LITTLE_ENDIAN);
	return dataTypeExtractor(localDs, msgData, 0, 0, fieldProperty.sizeBlock);
}

function getChainByBlockSmall(ds, msgData, fieldProperty) {
	var blockChain = [];
	var nextBlockSmall = fieldProperty.startBlock;
	while (nextBlockSmall != CONST.MSG.END_OF_CHAIN) {
		blockChain.push(nextBlockSmall);
		nextBlockSmall = getNextBlockSmall(ds, msgData, nextBlockSmall);
	}
	return blockChain;
}

function getFieldValue(ds, msgData, fieldProperty, typeMapped) {
	var value = null;

	var valueExtractor =
		fieldProperty.sizeBlock < CONST.MSG.BIG_BLOCK_MIN_DOC_SIZE
			? extractorFieldValue.sbat
			: extractorFieldValue.bat;
	var dataTypeExtractor = valueExtractor.dataType[typeMapped];

	if (dataTypeExtractor) {
		value = valueExtractor.extractor(ds, msgData, fieldProperty, dataTypeExtractor);
	}
	return value;
}

function convertUint8ArrayToString(uint8ArraValue) {
	return new TextDecoder('utf-8').decode(uint8ArraValue);
}

// MSG Reader
var MSGReader = function (arrayBuffer) {
	this.ds = new DataStream(arrayBuffer, 0, DataStream.LITTLE_ENDIAN);
};

MSGReader.prototype = {
	/**
       Converts bytes to fields information
  
       @return {Object} The fields data for MSG file
       */
	getFileData: function () {
		if (!isMSGFile(this.ds)) {
			return { error: 'Unsupported file type!' };
		}
		if (this.fileData == null) {
			this.fileData = parseMsgData(this.ds);
		}
		return this.fileData.fieldsData;
	},
	/**
       Reads an attachment content by key/ID
  
       @return {Object} The attachment for specific attachment key
       */
	getAttachment: function (attach) {
		var attachData = typeof attach === 'number' ? this.fileData.fieldsData.attachments[attach] : attach;
		var fieldProperty = this.fileData.propertyData[attachData.dataId];
		var fieldTypeMapped = CONST.MSG.FIELD.TYPE_MAPPING[getFieldType(fieldProperty)];
		var fieldData = getFieldValue(this.ds, this.fileData, fieldProperty, fieldTypeMapped);

		return { fileName: attachData.fileName, content: fieldData };
	},
};

module.exports = {
	MSGReader,
	DataStream,
};
