import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { Room } from '../models/Room.js';
import { RoomObject } from '../models/RoomObject.js';
import { Space } from '../models/Space.js';
import { SpaceMember } from '../models/SpaceMember.js';
import { CURATED_WORLD_ASSET_MAP } from '@metaverse/shared';
import type { RoomTemplateKeyType } from '@metaverse/shared';
import { createTemplateRoom, regenerateRoomFromTemplate, syncSpaceTeleports } from '../world/space-layout.js';
import { canManageAssets, canManageRooms } from '../utils/space-access.js';

async function assertRoomMembership(roomId: string, userId?: string) {
  if (!userId) return null;
  const room = await Room.findById(roomId);
  if (!room) return null;
  const member = await SpaceMember.findOne({ spaceId: room.spaceId, userId });
  if (!member) return null;
  return room;
}

async function ensureRoomManager(roomId: string, userId?: string) {
  if (!userId) return null;
  const room = await Room.findById(roomId);
  if (!room) return null;
  const member = await SpaceMember.findOne({ spaceId: room.spaceId, userId });
  if (!canManageRooms(member)) return null;
  return { room, member };
}

async function reorderRooms(spaceId: string, movingRoomId: string, nextOrder: number) {
  const rooms = await Room.find({ spaceId }).sort({ order: 1, createdAt: 1 });
  const index = rooms.findIndex((room) => room._id.toString() === movingRoomId);
  if (index === -1) return rooms;

  const [movingRoom] = rooms.splice(index, 1);
  const boundedIndex = Math.max(0, Math.min(nextOrder, rooms.length));
  rooms.splice(boundedIndex, 0, movingRoom);

  await Promise.all(
    rooms.map((room, order) =>
      Room.findByIdAndUpdate(room._id, { $set: { order } })
    )
  );

  return Room.find({ spaceId }).sort({ order: 1 });
}

export async function createRoom(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { spaceId, name, templateKey, maxOccupancy, isDefault } = req.body as {
      spaceId: string;
      name: string;
      templateKey: string;
      maxOccupancy?: number;
      isDefault?: boolean;
    };

    const member = await SpaceMember.findOne({ spaceId, userId: req.userId });
    if (!canManageRooms(member)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const roomCount = await Room.countDocuments({ spaceId });
    if (roomCount >= 8) {
      res.status(400).json({ error: 'Spaces are limited to 8 rooms' });
      return;
    }

    const room = await createTemplateRoom(spaceId, req.userId ?? '', {
      templateKey,
      name,
      isDefault,
    });

    if (typeof maxOccupancy === 'number') {
      room.maxOccupancy = maxOccupancy;
      await room.save();
    }

    const space = await Space.findById(spaceId);
    const defaultRoomId =
      isDefault || !space?.settings.defaultRoom
        ? room._id.toString()
        : space.settings.defaultRoom.toString();

    if (space) {
      space.set('settings.defaultRoom', defaultRoomId);
      await space.save();
    }

    await syncSpaceTeleports(spaceId, req.userId ?? '', defaultRoomId);
    res.status(201).json(room);
  } catch {
    res.status(500).json({ error: 'Failed to create room' });
  }
}

export async function getRooms(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { spaceId } = req.params;
    const [space, member] = await Promise.all([
      Space.findById(spaceId).select('visibility settings.defaultRoom'),
      SpaceMember.findOne({ spaceId, userId: req.userId }),
    ]);

    if (!space) {
      res.status(404).json({ error: 'Space not found' });
      return;
    }

    if (!member && space.visibility !== 'public') {
      res.status(403).json({ error: 'Not a member of this space' });
      return;
    }

    const rooms = await Room.find({ spaceId }).sort({ order: 1 });
    res.json(
      rooms.map((room) => ({
        ...room.toObject(),
        isDefault: room._id.toString() === space.settings.defaultRoom?.toString(),
      }))
    );
  } catch {
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
}

export async function getRoom(req: AuthRequest, res: Response): Promise<void> {
  try {
    const roomId = String(req.params.roomId);
    const room = await assertRoomMembership(roomId, req.userId);
    if (!room) {
      res.status(404).json({ error: 'Room not found or access denied' });
      return;
    }
    res.json(room);
  } catch {
    res.status(500).json({ error: 'Failed to fetch room' });
  }
}

export async function updateRoom(req: AuthRequest, res: Response): Promise<void> {
  try {
    const roomId = String(req.params.roomId);
    const manager = await ensureRoomManager(roomId, req.userId);
    if (!manager) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const { room } = manager;
    const {
      name,
      templateKey,
      maxOccupancy,
      isLocked,
      order,
      isDefault,
    } = req.body as {
      name?: string;
      templateKey?: string;
      maxOccupancy?: number;
      isLocked?: boolean;
      order?: number;
      isDefault?: boolean;
    };

    if (templateKey) {
      await regenerateRoomFromTemplate(room, req.userId ?? '', templateKey as RoomTemplateKeyType, {
        name,
        isLocked,
        maxOccupancy,
        order,
      });
    } else {
      if (name !== undefined) room.name = name;
      if (typeof isLocked === 'boolean') room.isLocked = isLocked;
      if (typeof maxOccupancy === 'number') room.maxOccupancy = maxOccupancy;
      await room.save();
      if (typeof order === 'number') {
        await reorderRooms(room.spaceId.toString(), room._id.toString(), order);
      }
    }

    const space = await Space.findById(room.spaceId);
    if (!space) {
      res.status(404).json({ error: 'Space not found' });
      return;
    }

    if (isDefault) {
      space.set('settings.defaultRoom', room._id);
      await space.save();
    }

    const defaultRoomId = space.settings.defaultRoom?.toString() ?? room._id.toString();
    await syncSpaceTeleports(room.spaceId.toString(), req.userId ?? '', defaultRoomId);

    const refreshed = await Room.findById(roomId);
    res.json(refreshed);
  } catch {
    res.status(500).json({ error: 'Update failed' });
  }
}

export async function deleteRoom(req: AuthRequest, res: Response): Promise<void> {
  try {
    const roomId = String(req.params.roomId);
    const manager = await ensureRoomManager(roomId, req.userId);
    if (!manager) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const { room } = manager;
    const roomCount = await Room.countDocuments({ spaceId: room.spaceId });
    if (roomCount <= 1) {
      res.status(400).json({ error: 'A space must keep at least one room' });
      return;
    }

    await RoomObject.deleteMany({ roomId: room._id });
    await Room.findByIdAndDelete(room._id);

    const remainingRooms = await Room.find({ spaceId: room.spaceId }).sort({ order: 1 });
    await Promise.all(
      remainingRooms.map((entry, order) =>
        Room.findByIdAndUpdate(entry._id, { $set: { order } })
      )
    );

    const space = await Space.findById(room.spaceId);
    if (space) {
      const nextDefault =
        remainingRooms.find((entry) => entry._id.toString() === space.settings.defaultRoom?.toString()) ??
        remainingRooms[0];
      if (nextDefault) {
        space.set('settings.defaultRoom', nextDefault._id);
        await space.save();
        await syncSpaceTeleports(room.spaceId.toString(), req.userId ?? '', nextDefault._id.toString());
      }
    }

    res.json({ message: 'Room deleted' });
  } catch {
    res.status(500).json({ error: 'Delete failed' });
  }
}

export async function placeObject(req: AuthRequest, res: Response): Promise<void> {
  try {
    const roomId = String(req.params.roomId);
    const room = await Room.findById(roomId).select('spaceId');
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    const member = await SpaceMember.findOne({ spaceId: room.spaceId, userId: req.userId });
    if (!canManageAssets(member)) {
      res.status(403).json({ error: 'Missing asset management permission' });
      return;
    }

    const {
      assetId,
      position,
      rotation,
      isObstacle,
      isInteractive,
      interactionType,
      interactionData,
    } = req.body;

    const obj = await RoomObject.create({
      roomId,
      assetId,
      position,
      rotation: rotation || 0,
      isObstacle: isObstacle || false,
      isInteractive: isInteractive || false,
      interactionType: interactionType || 'none',
      interactionData: interactionData || {},
      placedBy: req.userId,
    });

    res.status(201).json(obj);
  } catch {
    res.status(500).json({ error: 'Failed to place object' });
  }
}

export async function getObjects(req: AuthRequest, res: Response): Promise<void> {
  try {
    const roomId = String(req.params.roomId);
    const room = await assertRoomMembership(roomId, req.userId);
    if (!room) {
      res.status(404).json({ error: 'Room not found or access denied' });
      return;
    }

    const objects = await RoomObject.find({ roomId }).populate('assetId');
    res.json(objects);
  } catch {
    res.status(500).json({ error: 'Failed to fetch objects' });
  }
}

export async function getWorld(req: AuthRequest, res: Response): Promise<void> {
  try {
    const roomId = String(req.params.roomId);
    const room = await assertRoomMembership(roomId, req.userId);
    if (!room) {
      res.status(404).json({ error: 'Room not found or access denied' });
      return;
    }

    const [objects, connectedRooms] = await Promise.all([
      RoomObject.find({ roomId: room._id }).populate('assetId', 'slug name category dimensions tags'),
      Room.find({ spaceId: room.spaceId }).select('_id name type templateKey order').sort({ order: 1 }),
    ]);

    const serializedObjects = objects.map((object) => {
      const asset = object.assetId as unknown as {
        _id: string;
        slug?: string;
        name?: string;
        category?: string;
        dimensions?: { widthTiles: number; heightTiles: number };
        tags?: string[];
      };

      const slug = asset.slug ?? '';
      return {
        _id: object._id,
        roomId: object.roomId,
        assetId: object.assetId,
        position: object.position,
        rotation: object.rotation,
        zIndex: object.zIndex,
        isObstacle: object.isObstacle,
        isInteractive: object.isInteractive,
        interactionType: object.interactionType,
        interactionData: object.interactionData,
        placedBy: object.placedBy,
        asset: slug
          ? {
              slug,
              name: asset.name ?? slug,
              category: asset.category ?? CURATED_WORLD_ASSET_MAP[slug]?.category,
              dimensions: asset.dimensions ?? CURATED_WORLD_ASSET_MAP[slug]?.dimensions,
              tags: asset.tags ?? CURATED_WORLD_ASSET_MAP[slug]?.styleTags ?? [],
            }
          : null,
      };
    });

    res.json({
      room,
      objects: serializedObjects,
      connectedRooms,
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch room world' });
  }
}

export async function updateObject(req: AuthRequest, res: Response): Promise<void> {
  try {
    const object = await RoomObject.findById(req.params.objectId).populate('roomId', 'spaceId');
    if (!object) {
      res.status(404).json({ error: 'Object not found' });
      return;
    }

    const room = object.roomId as unknown as { spaceId?: string };
    const member = room.spaceId
      ? await SpaceMember.findOne({ spaceId: room.spaceId, userId: req.userId })
      : null;
    if (!canManageAssets(member)) {
      res.status(403).json({ error: 'Missing asset management permission' });
      return;
    }

    const updated = await RoomObject.findByIdAndUpdate(
      req.params.objectId,
      { $set: req.body },
      { new: true }
    );
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Update failed' });
  }
}

export async function removeObject(req: AuthRequest, res: Response): Promise<void> {
  try {
    const object = await RoomObject.findById(req.params.objectId).populate('roomId', 'spaceId');
    if (!object) {
      res.status(404).json({ error: 'Object not found' });
      return;
    }

    const room = object.roomId as unknown as { spaceId?: string };
    const member = room.spaceId
      ? await SpaceMember.findOne({ spaceId: room.spaceId, userId: req.userId })
      : null;
    if (!canManageAssets(member)) {
      res.status(403).json({ error: 'Missing asset management permission' });
      return;
    }

    await RoomObject.findByIdAndDelete(req.params.objectId);
    res.json({ message: 'Object removed' });
  } catch {
    res.status(500).json({ error: 'Remove failed' });
  }
}
