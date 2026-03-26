import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';


export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    // Get current published status
    const { data: study, error: fetchError } = await supabase
      .from('case_studies')
      .select('published')
      .eq('id', id)
      .single();

    if (fetchError || !study) {
      return NextResponse.json(
        { error: 'Case study not found' },
        { status: 404 }
      );
    }

    const { error: updateError } = await supabase
      .from('case_studies')
      .update({ published: !study.published })
      .eq('id', id);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      published: !study.published,
    });

  } catch (error) {
    console.error('Error toggling publish:', error);
    return NextResponse.json(
      { error: 'Failed to toggle publish status' },
      { status: 500 }
    );
  }
}
