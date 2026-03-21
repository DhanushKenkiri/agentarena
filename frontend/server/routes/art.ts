import { Router, Request, Response } from 'express';
import { authMiddleware, requireAuth } from '../auth';
import {
  dbInsertArtwork, dbGetArtwork, dbGetAllArtworks, dbGetArtworksByUser,
  dbUpdateArtwork, dbDeleteArtwork, dbIncrementArtworkViews,
  dbInsertArtworkComment, dbGetArtworkComments, dbDeleteArtworkComment,
  dbLikeArtwork, dbUnlikeArtwork, dbCheckLikes,
  dbGetTopArtworks, dbSearchArtworks,
  dbGetUser, dbUpdateUser,
  type Artwork,
  saveBlobNow,
} from '../db';

const router = Router();

// Routes are public (anyone can view), but creation/interaction requires auth

// ─── Get All Artworks (Gallery) ─────────────────────────────────

router.get('/artworks', (req: Request, res: Response) => {
  try {
    const allArtworks = dbGetAllArtworks();
    res.json({
      ok: true,
      artworks: allArtworks,
      total: allArtworks.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Get Top Artworks (Featured) ───────────────────────────────

router.get('/artworks/featured', (_req: Request, res: Response) => {
  try {
    const topArtworks = dbGetTopArtworks(12);
    res.json({
      ok: true,
      artworks: topArtworks,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Search Artworks ───────────────────────────────────────────

router.get('/artworks/search', (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string) || '';
    if (query.length < 2) {
      return res.json({ ok: true, artworks: [], message: 'Query too short' });
    }
    const results = dbSearchArtworks(query);
    res.json({
      ok: true,
      artworks: results,
      total: results.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Get Artwork by ID ──────────────────────────────────────────

router.get('/artworks/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const artwork = dbGetArtwork(id);
    if (!artwork) {
      return res.status(404).json({ error: 'Artwork not found' });
    }

    // Increment view count
    dbIncrementArtworkViews(id);

    // Get comments
    const comments = dbGetArtworkComments(id);

    // Get like count
    const likeCount = dbCheckLikes(id);

    res.json({
      ok: true,
      artwork,
      comments,
      likeCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Get User's Artworks ───────────────────────────────────────

router.get('/users/:userId/artworks', (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId as string, 10);
    const artworks = dbGetArtworksByUser(userId);
    res.json({
      ok: true,
      artworks,
      total: artworks.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Create Artwork (Requires Auth) ─────────────────────────────

router.post('/artworks', authMiddleware, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { title, description, canvasData, imageUrl, tags, style } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!canvasData) {
      return res.status(400).json({ error: 'Canvas data is required' });
    }

    const artwork = dbInsertArtwork({
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      character: user.character,
      title: title.trim(),
      description: description?.trim() || '',
      canvasData,
      imageUrl: imageUrl || '',
      tags: Array.isArray(tags) ? tags.filter((t: any) => typeof t === 'string').slice(0, 5) : [],
      style: style || 'mixed',
    });

    // Update user karma for contribution
    const updatedUser = dbGetUser(user.id);
    if (updatedUser) {
      dbUpdateUser(user.id, {
        karma: (updatedUser.karma || 0) + 5,
      });
    }

    res.status(201).json({
      ok: true,
      artwork,
      message: 'Artwork created successfully',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Update Artwork (Requires Auth + Ownership) ─────────────────

router.put('/artworks/:id', authMiddleware, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const id = parseInt(req.params.id as string, 10);
    const artwork = dbGetArtwork(id);

    if (!artwork) {
      return res.status(404).json({ error: 'Artwork not found' });
    }

    if (artwork.userId !== user.id) {
      return res.status(403).json({ error: 'Forbidden: Not your artwork' });
    }

    const { title, description, canvasData, tags, style } = req.body;

    const updates: Partial<Artwork> = {};
    if (title && title.trim()) updates.title = title.trim();
    if (description !== undefined) updates.description = description.trim();
    if (canvasData) updates.canvasData = canvasData;
    if (tags && Array.isArray(tags)) updates.tags = tags.filter((t: any) => typeof t === 'string').slice(0, 5);
    if (style) updates.style = style;

    dbUpdateArtwork(id, updates);
    const updated = dbGetArtwork(id);

    res.json({
      ok: true,
      artwork: updated,
      message: 'Artwork updated successfully',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Delete Artwork (Requires Auth + Ownership) ──────────────────

router.delete('/artworks/:id', authMiddleware, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const id = parseInt(req.params.id as string, 10);
    const artwork = dbGetArtwork(id);

    if (!artwork) {
      return res.status(404).json({ error: 'Artwork not found' });
    }

    if (artwork.userId !== user.id) {
      return res.status(403).json({ error: 'Forbidden: Not your artwork' });
    }

    dbDeleteArtwork(id);

    res.json({
      ok: true,
      message: 'Artwork deleted successfully',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Like Artwork (Requires Auth) ──────────────────────────────

router.post('/artworks/:id/like', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const id = parseInt(req.params.id as string, 10);
    const artwork = dbGetArtwork(id);

    if (!artwork) {
      return res.status(404).json({ error: 'Artwork not found' });
    }

    const liked = dbLikeArtwork(id, user.id);
    await saveBlobNow();

    res.json({
      ok: true,
      liked,
      likeCount: dbCheckLikes(id),
      message: liked ? 'Artwork liked' : 'Already liked',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Unlike Artwork (Requires Auth) ────────────────────────────

router.post('/artworks/:id/unlike', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const id = parseInt(req.params.id as string, 10);
    const artwork = dbGetArtwork(id);

    if (!artwork) {
      return res.status(404).json({ error: 'Artwork not found' });
    }

    const unliked = dbUnlikeArtwork(id, user.id);
    await saveBlobNow();

    res.json({
      ok: true,
      unliked,
      likeCount: dbCheckLikes(id),
      message: unliked ? 'Like removed' : 'Not liked',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Post Comment on Artwork (Requires Auth) ────────────────────

router.post('/artworks/:id/comments', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const id = parseInt(req.params.id as string, 10);
    const artwork = dbGetArtwork(id);

    if (!artwork) {
      return res.status(404).json({ error: 'Artwork not found' });
    }

    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const comment = dbInsertArtworkComment(id, user.id, user.username, text.trim());
    await saveBlobNow();

    res.status(201).json({
      ok: true,
      comment,
      message: 'Comment posted successfully',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Delete Comment (Requires Auth + Ownership) ──────────────────

router.delete('/artworks/:artworkId/comments/:commentId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const artworkId = parseInt(req.params.artworkId as string, 10);
    const commentId = parseInt(req.params.commentId as string, 10);

    const comments = dbGetArtworkComments(artworkId);
    const comment = comments.find(c => c.id === commentId);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.userId !== user.id) {
      return res.status(403).json({ error: 'Forbidden: Not your comment' });
    }

    dbDeleteArtworkComment(commentId);
    await saveBlobNow();

    res.json({
      ok: true,
      message: 'Comment deleted successfully',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Get Statistics ────────────────────────────────────────────

router.get('/stats/art', (_req: Request, res: Response) => {
  try {
    const allArtworks = dbGetAllArtworks();
    const totalViews = allArtworks.reduce((sum, a) => sum + (a.views || 0), 0);
    const totalLikes = allArtworks.reduce((sum, a) => sum + (a.likes || 0), 0);
    const totalComments = allArtworks.reduce((sum, a) => sum + (a.comments || 0), 0);

    const artistCount = new Set(allArtworks.map(a => a.userId)).size;

    res.json({
      ok: true,
      stats: {
        totalArtworks: allArtworks.length,
        totalArtists: artistCount,
        totalViews,
        totalLikes,
        totalComments,
        averageViewsPerArtwork: allArtworks.length > 0 ? Math.round(totalViews / allArtworks.length) : 0,
        averageLikesPerArtwork: allArtworks.length > 0 ? Math.round(totalLikes / allArtworks.length) : 0,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
