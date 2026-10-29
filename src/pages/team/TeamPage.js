import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import VisualLineup from '../../components/visual-lineup/VisualLineup';
import elementsImages from '../../data/elements_img.json';
import genderImages from '../../data/gender_img.json';
import { getTeam } from '../../services/frontierApi';
import './TeamPage.css';

const POSITION_ORDER = ['POR', 'DEF', 'MED', 'DEL'];
const POSITION_LABELS = {
  POR: 'Porteros',
  DEF: 'Defensas',
  MED: 'Medios',
  DEL: 'Delanteros',
};
const TEAM_SECTIONS = [
  { key: 'squad', label: 'Plantilla' },
  { key: 'generator', label: 'Generar 11' },
  { key: 'analysis', label: 'Analisis de equipo' },
];
const ELEMENT_ORDER = ['FUE', 'BOS', 'MON', 'AIR'];
const PREFERRED_FORMATION_KEYS = ['4-4-2', '4-3-3', '5-3-2', '3-5-2', '4-5-1'];
const AFFINITY_OPTIONS = [
  { value: 'NEUTRO', label: 'Neutro' },
  { value: 'FUE', label: 'Fuego' },
  { value: 'BOS', label: 'Bosque' },
  { value: 'MON', label: 'Montaña' },
  { value: 'AIR', label: 'Aire' },
];
const AFFINITY_GUIDE = {
  NEUTRO: 'Nadie sube ni baja.',
  FUE: '+2 Fuego, +1 Montaña, -1 Bosque.',
  BOS: '+2 Bosque, +1 Fuego, -1 Aire.',
  MON: '+2 Montaña, +1 Aire, -1 Fuego.',
  AIR: '+2 Aire, +1 Bosque, -1 Montaña.',
};
const ROTATION_OPTIONS = [
  { value: 'BEST', label: 'El mejor 11' },
  { value: 'BALANCED', label: 'Equilibrado' },
  { value: 'LOWEST', label: 'Rotacion completa' },
];
const AFFINITY_RULES = {
  NEUTRO: { FUE: 0, BOS: 0, MON: 0, AIR: 0 },
  FUE: { FUE: 2, MON: 1, BOS: -1, AIR: 0 },
  BOS: { BOS: 2, FUE: 1, AIR: -1, MON: 0 },
  MON: { MON: 2, AIR: 1, FUE: -1, BOS: 0 },
  AIR: { AIR: 2, BOS: 1, MON: -1, FUE: 0 },
};

function buildFormationOptions() {
  const options = [];

  for (let def = 6; def >= 2; def -= 1) {
    for (let med = 6; med >= 2; med -= 1) {
      const del = 10 - def - med;

      if (del < 2 || del > 5) {
        continue;
      }

      const label = `${def}-${med}-${del}`;

      options.push({
        key: label,
        label,
        counts: { POR: 1, DEF: def, MED: med, DEL: del },
      });
    }
  }

  return options;
}

const FORMATION_OPTIONS = buildFormationOptions();

function getTeamDisplayName(team) {
  return team.name && team.name.trim() ? team.name : `Equipo ${team.id}`;
}

function normalizeTeamPlayer(rawPlayer) {
  return {
    ...rawPlayer,
    playerId: rawPlayer?.player_id ?? null,
    player: rawPlayer?.name || `Jugador ${rawPlayer?.player_id ?? '-'}`,
    nickname: rawPlayer?.nickname ?? '',
    img: rawPlayer?.img ?? '',
    gender: rawPlayer?.gender ?? '',
    element: rawPlayer?.element ?? '',
    position: rawPlayer?.position ?? '',
    average: rawPlayer?.average ?? null,
  };
}

function getCaptainLabel(captainValue) {
  if (captainValue === 1) {
    return 'Capitan';
  }

  if (captainValue === 2) {
    return 'Co-capitan';
  }

  return '';
}

function isCoach(player) {
  return player.average === null;
}

function getCaptainPriority(captainValue) {
  if (captainValue === 1) {
    return 2;
  }

  if (captainValue === 2) {
    return 1;
  }

  return 0;
}

function comparePlayersByName(firstPlayer, secondPlayer) {
  return firstPlayer.player.localeCompare(secondPlayer.player);
}

function getAffinityScore(element, affinity) {
  return AFFINITY_RULES[affinity]?.[element] ?? 0;
}

function getPlayerBaseMedia(player) {
  return typeof player.average === 'number' ? player.average : 0;
}

function getPlayerAdjustedMedia(player, affinity) {
  return getPlayerBaseMedia(player) + getAffinityScore(player.element, affinity);
}

function getPositionRank(position) {
  const rank = POSITION_ORDER.indexOf(position);
  return rank === -1 ? Number.MAX_SAFE_INTEGER : rank;
}

function decoratePlayerForLineup(player, position, affinity) {
  return {
    ...player,
    idealPosition: position,
    affinityScore: getAffinityScore(player.element, affinity),
    baseMedia: getPlayerBaseMedia(player),
    adjustedMedia: getPlayerAdjustedMedia(player, affinity),
  };
}

function getAvailableCounts(players) {
  return POSITION_ORDER.reduce((counts, position) => {
    counts[position] = players.filter((player) => player.position === position).length;
    return counts;
  }, {});
}

function isFormationAvailable(formationCounts, availableCounts) {
  return POSITION_ORDER.every(
    (position) => formationCounts[position] <= (availableCounts[position] ?? 0)
  );
}

function getDefaultFormationOption(availableCounts) {
  const availableOptions = FORMATION_OPTIONS.filter((option) =>
    isFormationAvailable(option.counts, availableCounts)
  );
  const preferredOption = PREFERRED_FORMATION_KEYS.map((preferredKey) =>
    availableOptions.find((option) => option.key === preferredKey)
  ).find(Boolean);

  return (
    preferredOption ||
    availableOptions[0] ||
    FORMATION_OPTIONS[0]
  );
}

function compareDecoratedPlayers(firstPlayer, secondPlayer) {
  const adjustedMediaDifference =
    secondPlayer.adjustedMedia - firstPlayer.adjustedMedia;

  if (adjustedMediaDifference !== 0) {
    return adjustedMediaDifference;
  }

  const baseMediaDifference = secondPlayer.baseMedia - firstPlayer.baseMedia;

  if (baseMediaDifference !== 0) {
    return baseMediaDifference;
  }

  const affinityDifference =
    secondPlayer.affinityScore - firstPlayer.affinityScore;

  if (affinityDifference !== 0) {
    return affinityDifference;
  }

  const captainDifference =
    getCaptainPriority(secondPlayer.captain) -
    getCaptainPriority(firstPlayer.captain);

  if (captainDifference !== 0) {
    return captainDifference;
  }

  return firstPlayer.player.localeCompare(secondPlayer.player);
}

function getAverageAdjustedMedia(players) {
  if (players.length === 0) {
    return 0;
  }

  return (
    players.reduce((total, player) => total + player.adjustedMedia, 0) /
    players.length
  );
}

function selectPlayersByRotationMode(players, count, rotationMode) {
  const rankedPlayers = [...players].sort(compareDecoratedPlayers);

  if (rotationMode === 'LOWEST') {
    const nonPenalizedPlayers = rankedPlayers.filter(
      (player) => player.affinityScore >= 0
    );
    const candidatePlayers =
      nonPenalizedPlayers.length >= count ? nonPenalizedPlayers : rankedPlayers;

    return [...candidatePlayers]
      .reverse()
      .slice(0, count)
      .sort(compareDecoratedPlayers);
  }

  if (rotationMode === 'BALANCED') {
    const bestPlayers = rankedPlayers.slice(0, count);
    const worstPlayers = [...rankedPlayers]
      .reverse()
      .slice(0, count);
    const targetAverage =
      (getAverageAdjustedMedia(bestPlayers) +
        getAverageAdjustedMedia(worstPlayers)) /
      2;
    const middleRank = (rankedPlayers.length - 1) / 2;

    return rankedPlayers
      .map((player, index) => ({
        ...player,
        rankIndex: index,
      }))
      .sort((firstPlayer, secondPlayer) => {
        const averageDistanceDifference =
          Math.abs(firstPlayer.adjustedMedia - targetAverage) -
          Math.abs(secondPlayer.adjustedMedia - targetAverage);

        if (averageDistanceDifference !== 0) {
          return averageDistanceDifference;
        }

        const rankDistanceDifference =
          Math.abs(firstPlayer.rankIndex - middleRank) -
          Math.abs(secondPlayer.rankIndex - middleRank);

        if (rankDistanceDifference !== 0) {
          return rankDistanceDifference;
        }

        return compareDecoratedPlayers(firstPlayer, secondPlayer);
      })
      .slice(0, count)
      .sort(compareDecoratedPlayers);
  }

  return rankedPlayers.slice(0, count);
}

function generateIdealLineup(players, formation, affinity, rotationMode = 'BEST') {
  return POSITION_ORDER.flatMap((position) => {
    const decoratedPlayers = players
      .filter((player) => player.position === position)
      .map((player) => decoratePlayerForLineup(player, position, affinity));
    const selectedPlayers = selectPlayersByRotationMode(
      decoratedPlayers,
      formation[position],
      rotationMode
    );

    return selectedPlayers;
  });
}

function getAffinityScoreLabel(score) {
  if (score > 0) {
    return `+${score}`;
  }

  return `${score}`;
}

function getElementImage(element) {
  if (!element) {
    return elementsImages.NEUTRO || elementsImages.neutro || '';
  }

  return (
    elementsImages[element] ||
    elementsImages[String(element).toUpperCase()] ||
    elementsImages[String(element).toLowerCase()] ||
    ''
  );
}

function getGenderImage(gender) {
  return genderImages[gender] || '';
}

function getPlayerKey(player) {
  return `${player.playerId ?? player.player}-${player.average ?? 'sin-media'}-${player.position || 'sin-posicion'}`;
}

function buildSelectedPlayersState(players) {
  return players.reduce((selectedState, player) => {
    selectedState[getPlayerKey(player)] = true;
    return selectedState;
  }, {});
}

function buildDeselectedPlayersState(players) {
  return players.reduce((selectedState, player) => {
    selectedState[getPlayerKey(player)] = false;
    return selectedState;
  }, {});
}

function getFormationPreferenceRank(formationKey) {
  const preferenceIndex = PREFERRED_FORMATION_KEYS.indexOf(formationKey);
  return preferenceIndex === -1 ? Number.MAX_SAFE_INTEGER : preferenceIndex;
}

function getBestFormationAnalysis(players, affinity) {
  const availableCounts = getAvailableCounts(players);
  const candidates = FORMATION_OPTIONS.filter((option) =>
    isFormationAvailable(option.counts, availableCounts)
  )
    .map((option) => {
      const lineup = generateIdealLineup(players, option.counts, affinity, 'BEST');
      const totalMedia = lineup.reduce(
        (sum, player) => sum + player.adjustedMedia,
        0
      );

      return {
        formation: option,
        lineup,
        totalMedia,
        averageMedia: lineup.length > 0 ? totalMedia / lineup.length : 0,
      };
    })
    .sort((firstCandidate, secondCandidate) => {
      if (secondCandidate.totalMedia !== firstCandidate.totalMedia) {
        return secondCandidate.totalMedia - firstCandidate.totalMedia;
      }

      if (secondCandidate.averageMedia !== firstCandidate.averageMedia) {
        return secondCandidate.averageMedia - firstCandidate.averageMedia;
      }

      return (
        getFormationPreferenceRank(firstCandidate.formation.key) -
        getFormationPreferenceRank(secondCandidate.formation.key)
      );
    });

  return candidates[0] || null;
}

function getBestPlayersByPosition(players) {
  return POSITION_ORDER.reduce((bestPlayers, position) => {
    const bestPlayerForPosition = [...players]
      .filter((player) => player.position === position)
      .sort((firstPlayer, secondPlayer) => {
        const mediaDifference =
          getPlayerBaseMedia(secondPlayer) - getPlayerBaseMedia(firstPlayer);

        if (mediaDifference !== 0) {
          return mediaDifference;
        }

        const captainDifference =
          getCaptainPriority(secondPlayer.captain) -
          getCaptainPriority(firstPlayer.captain);

        if (captainDifference !== 0) {
          return captainDifference;
        }

        return firstPlayer.player.localeCompare(secondPlayer.player);
      })[0] || null;

    bestPlayers[position] = bestPlayerForPosition;
    return bestPlayers;
  }, {});
}

function getReinforcementAnalysis(players) {
  const positionCounts = getAvailableCounts(players);
  const candidates = POSITION_ORDER.map((position) => {
    const playersForPosition = players.filter((player) => player.position === position);
    const averageMedia =
      playersForPosition.length > 0
        ? playersForPosition.reduce(
            (total, player) => total + getPlayerBaseMedia(player),
            0
          ) / playersForPosition.length
        : 0;

    return {
      position,
      count: positionCounts[position],
      averageMedia,
    };
  }).sort((firstCandidate, secondCandidate) => {
    if (firstCandidate.count !== secondCandidate.count) {
      return firstCandidate.count - secondCandidate.count;
    }

    if (firstCandidate.averageMedia !== secondCandidate.averageMedia) {
      return firstCandidate.averageMedia - secondCandidate.averageMedia;
    }

    return POSITION_ORDER.indexOf(firstCandidate.position) - POSITION_ORDER.indexOf(secondCandidate.position);
  });

  const primary = candidates[0] || null;

  if (!primary) {
    return null;
  }

  let message = `La posicion a reforzar ahora mismo es ${POSITION_LABELS[
    primary.position
  ].toLowerCase()}.`;

  if (primary.count === 0) {
    message = `No tienes jugadores activos en ${POSITION_LABELS[
      primary.position
    ].toLowerCase()}, asi que es la prioridad absoluta.`;
  } else if (primary.count === 1) {
    message = `Solo tienes una opcion activa en ${POSITION_LABELS[
      primary.position
    ].toLowerCase()}, asi que te conviene sumar fondo ahi.`;
  } else {
    message = `Tienes ${primary.count} jugadores activos en ${POSITION_LABELS[
      primary.position
    ].toLowerCase()} con una media media de ${primary.averageMedia.toFixed(1)}.`;
  }

  return {
    ...primary,
    message,
  };
}

function getAverageMedia(players) {
  if (!players || players.length === 0) {
    return 0;
  }

  return (
    players.reduce((total, player) => total + getPlayerBaseMedia(player), 0) /
    players.length
  );
}

function getLineStrengthAnalysis(players) {
  const lines = POSITION_ORDER.map((position) => {
    const playersForPosition = players.filter((player) => player.position === position);

    return {
      position,
      count: playersForPosition.length,
      averageMedia: getAverageMedia(playersForPosition),
    };
  }).filter((line) => line.count > 0);

  const strongestLine = [...lines].sort((firstLine, secondLine) => {
    if (secondLine.averageMedia !== firstLine.averageMedia) {
      return secondLine.averageMedia - firstLine.averageMedia;
    }

    return secondLine.count - firstLine.count;
  })[0] || null;

  const weakestLine = [...lines].sort((firstLine, secondLine) => {
    if (firstLine.averageMedia !== secondLine.averageMedia) {
      return firstLine.averageMedia - secondLine.averageMedia;
    }

    return firstLine.count - secondLine.count;
  })[0] || null;

  return {
    strongestLine,
    weakestLine,
    lines,
  };
}

function getBestAffinityAnalysis(players) {
  return AFFINITY_OPTIONS.map((option) => {
    const bestFormation = getBestFormationAnalysis(players, option.value);

    return {
      affinity: option.value,
      label: option.label,
      bestFormation,
      totalMedia: bestFormation?.totalMedia ?? -1,
      averageMedia: bestFormation?.averageMedia ?? -1,
    };
  }).sort((firstOption, secondOption) => {
    if (secondOption.totalMedia !== firstOption.totalMedia) {
      return secondOption.totalMedia - firstOption.totalMedia;
    }

    if (secondOption.averageMedia !== firstOption.averageMedia) {
      return secondOption.averageMedia - firstOption.averageMedia;
    }

    return (
      AFFINITY_OPTIONS.findIndex((option) => option.value === firstOption.affinity) -
      AFFINITY_OPTIONS.findIndex((option) => option.value === secondOption.affinity)
    );
  })[0] || null;
}

function renderElementBadge(element) {
  const image = getElementImage(element);

  return (
    <span className="element-chip">
      {image ? (
        <img className="element-chip__icon" src={image} alt="" />
      ) : null}
      <span>{element || '-'}</span>
    </span>
  );
}

function renderElementIcon(element) {
  const image = getElementImage(element);

  return image ? <img className="element-icon-only" src={image} alt="" /> : <span>-</span>;
}

function renderGenderIcon(gender) {
  const image = getGenderImage(gender);

  return image ? <img className="gender-icon-only" src={image} alt="" /> : <span>-</span>;
}

function renderAffinityOption(option, value, onChange) {
  const image = getElementImage(option.value);
  const isActive = value === option.value;

  return (
    <button
      key={option.value}
      type="button"
      className={
        isActive
          ? 'affinity-selector__option affinity-selector__option--active'
          : 'affinity-selector__option'
      }
      onClick={() => onChange(option.value)}
    >
      <span className="affinity-selector__option-top">
        {image ? (
          <img
            className="affinity-selector__icon"
            src={image}
            alt=""
          />
        ) : (
          <span className="affinity-selector__neutral">N</span>
        )}
        <span className="affinity-selector__label">{option.label}</span>
      </span>
      <span className="affinity-selector__hint">{AFFINITY_GUIDE[option.value]}</span>
    </button>
  );
}

function TeamPage() {
  const { teamId } = useParams();
  const [searchParams] = useSearchParams();
  const leagueId = searchParams.get('leagueId');
  const seasonId = searchParams.get('seasonId');
  const [team, setTeam] = useState(null);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeSection, setActiveSection] = useState('squad');
  const [affinity, setAffinity] = useState('NEUTRO');
  const [selectedFormationKey, setSelectedFormationKey] = useState(
    FORMATION_OPTIONS[0].key
  );
  const [selectedRotationMode, setSelectedRotationMode] = useState('BEST');
  const [idealLineup, setIdealLineup] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState({});
  const [manualSwapTarget, setManualSwapTarget] = useState(null);
  const [squadSort, setSquadSort] = useState(null);
  const teamPlayers = useMemo(
    () => (team?.players || []).map((player) => normalizeTeamPlayer(player)),
    [team]
  );
  const coach = useMemo(
    () => teamPlayers.find((player) => isCoach(player)) ?? null,
    [teamPlayers]
  );
  const squadPlayers = useMemo(
    () => teamPlayers.filter((player) => !isCoach(player)),
    [teamPlayers]
  );
  const displayedSquadPlayers = useMemo(() => {
    const alphabeticPlayers = [...squadPlayers].sort(comparePlayersByName);

    if (!squadSort) {
      return alphabeticPlayers;
    }

    if (squadSort.key === 'average') {
      return [...alphabeticPlayers].sort((firstPlayer, secondPlayer) => {
        const mediaDifference =
          squadSort.direction === 'desc'
            ? getPlayerBaseMedia(secondPlayer) - getPlayerBaseMedia(firstPlayer)
            : getPlayerBaseMedia(firstPlayer) - getPlayerBaseMedia(secondPlayer);

        if (mediaDifference !== 0) {
          return mediaDifference;
        }

        return comparePlayersByName(firstPlayer, secondPlayer);
      });
    }

    if (squadSort.key === 'position') {
      return [...alphabeticPlayers].sort((firstPlayer, secondPlayer) => {
        const positionDifference =
          squadSort.direction === 'asc'
            ? getPositionRank(firstPlayer.position) - getPositionRank(secondPlayer.position)
            : getPositionRank(secondPlayer.position) - getPositionRank(firstPlayer.position);

        if (positionDifference !== 0) {
          return positionDifference;
        }

        return comparePlayersByName(firstPlayer, secondPlayer);
      });
    }

    return alphabeticPlayers;
  }, [squadPlayers, squadSort]);
  const enabledSquadPlayers = useMemo(
    () =>
      squadPlayers.filter(
        (player) => selectedPlayers[getPlayerKey(player)] !== false
      ),
    [selectedPlayers, squadPlayers]
  );
  const availableCounts = useMemo(
    () => getAvailableCounts(enabledSquadPlayers),
    [enabledSquadPlayers]
  );
  const currentLineupKeys = useMemo(
    () => new Set(idealLineup.map((player) => getPlayerKey(player))),
    [idealLineup]
  );
  const selectedFormation = useMemo(
    () =>
      FORMATION_OPTIONS.find((option) => option.key === selectedFormationKey) ||
      FORMATION_OPTIONS[0],
    [selectedFormationKey]
  );
  const formationErrors = useMemo(() => {
    const errors = [];

    POSITION_ORDER.forEach((position) => {
      if (selectedFormation.counts[position] > availableCounts[position]) {
        errors.push(
          `${POSITION_LABELS[position]}: solo hay ${availableCounts[position]} disponibles.`
        );
      }
    });

    return errors;
  }, [availableCounts, selectedFormation]);
  const analysisAffinity =
    team?.field_element && AFFINITY_RULES[team.field_element]
      ? team.field_element
      : 'NEUTRO';
  const backLink =
    leagueId && seasonId
      ? `/?leagueId=${leagueId}&seasonId=${seasonId}`
      : '/';
  const analysisData = useMemo(() => {
    const fullSquadCounts = getAvailableCounts(squadPlayers);

    if (enabledSquadPlayers.length === 0) {
      return {
        positionCounts: getAvailableCounts([]),
        elementCounts: ELEMENT_ORDER.reduce((counts, element) => {
          counts[element] = 0;
          return counts;
        }, {}),
        bestPlayersByPosition: POSITION_ORDER.reduce((playersByPosition, position) => {
          playersByPosition[position] = null;
          return playersByPosition;
        }, {}),
        bestFormationAnalysis: null,
        bestAffinityAnalysis: null,
        reinforcementTarget: null,
        overallAverageMedia: 0,
        topPlayersOverall: [],
        strongestLine: null,
        weakestLine: null,
        considerations: ['Activa jugadores en plantilla para obtener analisis del equipo.'],
        recommendations: ['No hay jugadores activos para analizar.'],
      };
    }

    const positionCounts = getAvailableCounts(enabledSquadPlayers);
    const elementCounts = ELEMENT_ORDER.reduce((counts, element) => {
      counts[element] = enabledSquadPlayers.filter(
        (player) => player.element === element
      ).length;
      return counts;
    }, {});
    const bestPlayersByPosition = getBestPlayersByPosition(enabledSquadPlayers);
    const bestAffinityAnalysis = getBestAffinityAnalysis(enabledSquadPlayers);
    const bestFormationAnalysis =
      bestAffinityAnalysis?.bestFormation ||
      getBestFormationAnalysis(enabledSquadPlayers, analysisAffinity);
    const reinforcementTarget = getReinforcementAnalysis(enabledSquadPlayers);
    const overallAverageMedia = getAverageMedia(enabledSquadPlayers);
    const topPlayersOverall = [...enabledSquadPlayers]
      .sort((firstPlayer, secondPlayer) => {
        const mediaDifference =
          getPlayerBaseMedia(secondPlayer) - getPlayerBaseMedia(firstPlayer);

        if (mediaDifference !== 0) {
          return mediaDifference;
        }

        return (
          getCaptainPriority(secondPlayer.captain) -
          getCaptainPriority(firstPlayer.captain)
        );
      })
      .slice(0, 3);
    const { strongestLine, weakestLine } = getLineStrengthAnalysis(enabledSquadPlayers);
    const outfieldPositions = ['DEF', 'MED', 'DEL'];
    const strongestOutfieldPosition = outfieldPositions.reduce((bestPosition, position) =>
      positionCounts[position] > positionCounts[bestPosition] ? position : bestPosition
    , 'DEF');
    const weakestOutfieldPosition = outfieldPositions.reduce((lowestPosition, position) =>
      positionCounts[position] < positionCounts[lowestPosition] ? position : lowestPosition
    , 'DEF');
    const rareElements = ELEMENT_ORDER.filter((element) => elementCounts[element] <= 1);
    const dominantElement = ELEMENT_ORDER.reduce((bestElement, element) =>
      elementCounts[element] > elementCounts[bestElement] ? element : bestElement
    , 'FUE');
    const recommendations = [];
    const considerations = [];

    if (fullSquadCounts.POR <= 1) {
      recommendations.push(
        'Solo tienes un portero en plantilla, asi que conviene cubrir esa plaza cuanto antes.'
      );
    }

    if (
      positionCounts[strongestOutfieldPosition] -
        positionCounts[weakestOutfieldPosition] >=
      2
    ) {
      recommendations.push(
        `Tienes mucha mas profundidad en ${POSITION_LABELS[
          strongestOutfieldPosition
        ].toLowerCase()} que en ${POSITION_LABELS[
          weakestOutfieldPosition
        ].toLowerCase()}.`
      );
    }

    if (rareElements.length > 0) {
      recommendations.push(
        `Te falta variedad elemental en ${rareElements.join(', ')}.`
      );
    }

    if (bestAffinityAnalysis?.bestFormation) {
      recommendations.push(
        `Tu combinacion mas eficiente es ${bestAffinityAnalysis.bestFormation.formation.label} con afinidad ${bestAffinityAnalysis.label}.`
      );
    }

    if (reinforcementTarget) {
      recommendations.push(
        reinforcementTarget.message
      );
    }

    if (enabledSquadPlayers.length < 13) {
      considerations.push(
        'La rotacion es corta: tienes poco margen para cambios sin perder nivel.'
      );
    } else if (enabledSquadPlayers.length >= 16) {
      considerations.push(
        'Tienes una rotacion amplia, asi que puedes adaptar el once segun afinidad y rival.'
      );
    }

    if (strongestLine && weakestLine) {
      considerations.push(
        `Tu linea mas fuerte por media es ${POSITION_LABELS[
          strongestLine.position
        ].toLowerCase()} (${strongestLine.averageMedia.toFixed(1)}), mientras que la mas floja es ${POSITION_LABELS[
          weakestLine.position
        ].toLowerCase()} (${weakestLine.averageMedia.toFixed(1)}).`
      );
    }

    if (elementCounts[dominantElement] >= Math.ceil(enabledSquadPlayers.length / 2)) {
      considerations.push(
        `Tu plantilla depende bastante del elemento ${dominantElement}, lo que puede darte identidad clara pero menos variedad.`
      );
    }

    if (bestAffinityAnalysis?.affinity && bestAffinityAnalysis.affinity !== 'NEUTRO') {
      considerations.push(
        `La afinidad que mas potencia a tu grupo activo es ${bestAffinityAnalysis.label}.`
      );
    } else {
      considerations.push(
        'El equipo rinde de forma bastante estable incluso sin una afinidad marcada.'
      );
    }

    if (!enabledSquadPlayers.some((player) => player.captain === 1)) {
      considerations.push(
        'No hay capitan activo seleccionado ahora mismo, algo a vigilar si vas a probar variantes.'
      );
    }

    return {
      positionCounts,
      elementCounts,
      bestPlayersByPosition,
      bestFormationAnalysis,
      bestAffinityAnalysis,
      reinforcementTarget,
      overallAverageMedia,
      topPlayersOverall,
      strongestLine,
      weakestLine,
      considerations: considerations.slice(0, 5),
      recommendations: recommendations.slice(0, 5),
    };
  }, [analysisAffinity, enabledSquadPlayers, squadPlayers]);
  const swapCandidates = useMemo(() => {
    if (!manualSwapTarget) {
      return [];
    }

    return enabledSquadPlayers
      .filter((player) => player.position === manualSwapTarget.idealPosition)
      .filter((player) => getPlayerKey(player) !== getPlayerKey(manualSwapTarget))
      .filter((player) => !currentLineupKeys.has(getPlayerKey(player)))
      .map((player) =>
        decoratePlayerForLineup(player, manualSwapTarget.idealPosition, affinity)
      )
      .sort(compareDecoratedPlayers);
  }, [affinity, currentLineupKeys, enabledSquadPlayers, manualSwapTarget]);
  const bestUpgradeKey = useMemo(() => {
    if (!manualSwapTarget) {
      return null;
    }

    const bestUpgrade = swapCandidates.find(
      (player) => player.adjustedMedia > manualSwapTarget.adjustedMedia
    );

    return bestUpgrade ? getPlayerKey(bestUpgrade) : null;
  }, [manualSwapTarget, swapCandidates]);

  useEffect(() => {
    let isMounted = true;

    async function loadTeam() {
      setIsLoadingTeam(true);
      setLoadError('');

      try {
        const teamData = await getTeam(teamId, {
          leagueId,
          seasonId,
          includePlayers: true,
        });

        if (!isMounted) {
          return;
        }

        setTeam(teamData);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setTeam(null);
        setLoadError('No hemos podido cargar la informacion del equipo.');
      } finally {
        if (isMounted) {
          setIsLoadingTeam(false);
        }
      }
    }

    loadTeam();

    return () => {
      isMounted = false;
    };
  }, [leagueId, seasonId, teamId]);

  useEffect(() => {
    if (!team) {
      return;
    }

    const initialSelectedPlayers = buildSelectedPlayersState(squadPlayers);
    const initialAvailableCounts = getAvailableCounts(squadPlayers);
    const defaultFormationOption = getDefaultFormationOption(initialAvailableCounts);
    const initialLineup = generateIdealLineup(
      squadPlayers,
      defaultFormationOption.counts,
      'NEUTRO'
    );

    setActiveSection('squad');
    setSelectedPlayers(initialSelectedPlayers);
    setAffinity('NEUTRO');
    setSelectedFormationKey(defaultFormationOption.key);
    setSelectedRotationMode('BEST');
    setIdealLineup(initialLineup);
    setManualSwapTarget(null);
    setSquadSort(null);
  }, [squadPlayers, team]);

  if (isLoadingTeam) {
    return (
      <section className="page-section">
        <Link className="back-link" to={backLink}>
          Volver al listado
        </Link>
        <div className="panel panel-empty">Cargando equipo...</div>
      </section>
    );
  }

  if (!team) {
    return (
      <section className="page-section">
        <Link className="back-link" to={backLink}>
          Volver al listado
        </Link>
        <div className="panel panel-empty">
          {loadError || 'No hemos encontrado el equipo que buscas.'}
        </div>
      </section>
    );
  }

  const teamName = getTeamDisplayName(team);

  const handleGenerateLineup = () => {
    if (formationErrors.length > 0) {
      return;
    }

    setManualSwapTarget(null);
    setIdealLineup(
      generateIdealLineup(
        enabledSquadPlayers,
        selectedFormation.counts,
        affinity,
        selectedRotationMode
      )
    );
  };

  const handlePlayerToggle = (player) => {
    const playerKey = getPlayerKey(player);

    setSelectedPlayers((currentSelectedPlayers) => ({
      ...currentSelectedPlayers,
      [playerKey]: currentSelectedPlayers[playerKey] === false,
    }));
  };

  const handleToggleAllPlayers = () => {
    const areAllPlayersSelected =
      squadPlayers.length > 0 && enabledSquadPlayers.length === squadPlayers.length;

    setSelectedPlayers(
      areAllPlayersSelected
        ? buildDeselectedPlayersState(squadPlayers)
        : buildSelectedPlayersState(squadPlayers)
    );
  };

  const handleOpenManualSwap = (player) => {
    setManualSwapTarget(player);
  };

  const handleSquadSortToggle = (sortKey) => {
    setSquadSort((currentSort) => {
      if (!currentSort || currentSort.key !== sortKey) {
        return sortKey === 'average'
          ? { key: 'average', direction: 'desc' }
          : { key: 'position', direction: 'asc' };
      }

      if (sortKey === 'average') {
        if (currentSort.direction === 'desc') {
          return { key: 'average', direction: 'asc' };
        }

        return null;
      }

      if (currentSort.direction === 'asc') {
        return { key: 'position', direction: 'desc' };
      }

      return null;
    });
  };

  const handleCloseManualSwap = () => {
    setManualSwapTarget(null);
  };

  const handleManualSwap = (replacementPlayer) => {
    if (!manualSwapTarget) {
      return;
    }

    setIdealLineup((currentLineup) =>
      currentLineup.map((player) =>
        getPlayerKey(player) === getPlayerKey(manualSwapTarget) &&
        player.idealPosition === manualSwapTarget.idealPosition
          ? replacementPlayer
          : player
      )
    );
    setManualSwapTarget(null);
  };

  return (
    <section className="page-section">
      <Link className="back-link" to={backLink}>
        Volver al listado
      </Link>

      <header className="page-header">
        <p className="page-eyebrow">Detalle del equipo</p>
        <h1 className="page-title">{teamName}</h1>
        <p className="page-description">
          Consulta la informacion general del equipo y la ficha completa de sus
          jugadores.
        </p>
        {leagueId || seasonId ? (
          <div className="team-card__meta">
            {leagueId ? <span className="meta-pill">Liga: {leagueId}</span> : null}
            {seasonId ? <span className="meta-pill">Temporada: {seasonId}</span> : null}
          </div>
        ) : null}
      </header>

      <div className="team-summary">
        <article className="panel team-summary__hero">
          <div className="team-summary__team">
            <div className="team-summary__logo" aria-hidden="true">
              {team.logo ? (
                <img
                  className="team-summary__logo-image"
                  src={team.logo}
                  alt=""
                />
              ) : (
                <span>{teamName.slice(0, 2).toUpperCase()}</span>
              )}
            </div>

            <div className="team-summary__info">
              <h2 className="team-summary__name">{teamName}</h2>
              <div className="team-summary__meta">
                <span className="meta-pill">
                  Campo: {team.field || 'Sin definir'}
                </span>
                <span className="meta-pill">
                  <span className="element-pill-content">
                    <span>Elemento:</span>
                    {team.field_element
                      ? renderElementBadge(team.field_element)
                      : 'Sin definir'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {coach ? (
            <>
              <div className="team-summary__divider" aria-hidden="true" />
              <div className="team-summary__coach">
                <div className="coach-panel__header">
                  <h2 className="team-roster__title">Entrenador</h2>
                </div>

                <div className="coach-panel__body">
                  {coach.img ? (
                    <div className="coach-panel__image-wrap" aria-hidden="true">
                      <img className="coach-panel__image" src={coach.img} alt="" />
                    </div>
                  ) : null}

                  <div className="coach-panel__info">
                    <p className="coach-panel__name">{coach.player}</p>
                    <p className="coach-panel__subtitle">
                      {coach.nickname || 'Sin nickname'}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </article>
      </div>

      <div className="team-sections">
        <div className="team-sections__tabs" role="tablist" aria-label="Vistas del equipo">
          {TEAM_SECTIONS.map((section) => (
            <button
              key={section.key}
              type="button"
              className={
                activeSection === section.key
                  ? 'team-sections__tab team-sections__tab--active'
                  : 'team-sections__tab'
              }
              onClick={() => setActiveSection(section.key)}
            >
              {section.label}
            </button>
          ))}
        </div>

        {activeSection === 'generator' ? (
          <>
            <VisualLineup
              players={idealLineup}
              formationLabel={selectedFormation.label}
              teamName={teamName}
              teamLogo={team.logo}
              selectedAffinity={affinity}
              onPlayerClick={handleOpenManualSwap}
            />

            <article className="panel lineup-builder">
              <div className="lineup-builder__header">
                <div>
                  <h2 className="team-roster__title">Generar once ideal</h2>
                  <p className="lineup-builder__description">
                    Elige afinidad, alineacion y tipo de rotacion para preparar el
                    once. Los cambios se aplican solo al pulsar el boton.
                  </p>
                </div>

                <button
                  type="button"
                  className="lineup-builder__button"
                  onClick={handleGenerateLineup}
                  disabled={formationErrors.length > 0}
                >
                  Generar 11
                </button>
              </div>

              <div className="lineup-builder__controls">
                <div className="lineup-builder__field lineup-builder__field--full">
                  <span>Afinidad</span>
                  <div
                    className="affinity-selector"
                    role="radiogroup"
                    aria-label="Seleccionar afinidad"
                  >
                    {AFFINITY_OPTIONS.map((option) =>
                      renderAffinityOption(option, affinity, setAffinity)
                    )}
                  </div>
                </div>

                <label className="lineup-builder__field">
                  <span>Alineacion</span>
                  <select
                    value={selectedFormationKey}
                    onChange={(event) => setSelectedFormationKey(event.target.value)}
                  >
                    {FORMATION_OPTIONS.map((option) => {
                      const isAvailable = isFormationAvailable(
                        option.counts,
                        availableCounts
                      );

                      return (
                        <option key={option.key} value={option.key}>
                          {option.label}
                          {isAvailable ? '' : ' - no disponible'}
                        </option>
                      );
                    })}
                  </select>
                </label>

                <label className="lineup-builder__field">
                  <span>Rotacion</span>
                  <select
                    value={selectedRotationMode}
                    onChange={(event) => setSelectedRotationMode(event.target.value)}
                  >
                    {ROTATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {formationErrors.length > 0 ? (
                <div className="lineup-builder__errors" role="alert">
                  {formationErrors.map((error) => (
                    <p key={error}>{error}</p>
                  ))}
                </div>
              ) : null}

              <div className="lineup-builder__result">
                <div className="team-roster__table-wrap">
                  <table className="team-roster__table">
                    <thead>
                      <tr>
                        <th>Posicion</th>
                        <th>Jugador</th>
                        <th className="team-roster__cell--centered">Apodo</th>
                        <th className="team-roster__cell--centered">Genero</th>
                        <th className="team-roster__cell--centered">Media base</th>
                        <th className="team-roster__cell--centered">Elemento</th>
                        <th className="team-roster__cell--centered">Afinidad</th>
                        <th className="team-roster__cell--centered">Media final</th>
                        <th>Rango</th>
                      </tr>
                    </thead>
                    <tbody>
                      {idealLineup.map((player, index) => {
                        const captainLabel = getCaptainLabel(player.captain);

                        return (
                          <tr key={`${player.player}-${player.idealPosition}-${index}`}>
                            <td>{player.idealPosition}</td>
                            <td>
                              <div className="team-roster__player-cell">
                                {player.img ? (
                                  <div className="team-roster__player-image-wrap" aria-hidden="true">
                                    <img
                                      className="team-roster__player-image"
                                      src={player.img}
                                      alt=""
                                    />
                                  </div>
                                ) : (
                                  <div
                                    className="team-roster__player-image-wrap team-roster__player-image-wrap--fallback"
                                    aria-hidden="true"
                                  >
                                    <span>
                                      {player.player
                                        .split(' ')
                                        .slice(0, 2)
                                        .map((part) => part[0] || '')
                                        .join('')
                                        .toUpperCase()}
                                    </span>
                                  </div>
                                )}
                                <span>{player.player}</span>
                              </div>
                            </td>
                            <td className="team-roster__cell--centered">
                              {player.nickname || '-'}
                            </td>
                            <td className="team-roster__cell--centered">
                              {renderGenderIcon(player.gender)}
                            </td>
                            <td className="team-roster__cell--centered">{player.baseMedia}</td>
                            <td className="team-roster__cell--centered">
                              {renderElementIcon(player.element)}
                            </td>
                            <td className="team-roster__cell--centered">
                              {getAffinityScoreLabel(player.affinityScore)}
                            </td>
                            <td className="team-roster__cell--centered">
                              {player.adjustedMedia}
                            </td>
                            <td>{captainLabel || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </article>
          </>
        ) : null}

        {activeSection === 'squad' ? (
          <article className="panel team-roster">
            <div className="team-roster__header">
              <div className="team-roster__header-content">
                <h2 className="team-roster__title">Plantilla</h2>
                <button
                  type="button"
                  className="team-roster__toggle-all"
                  onClick={handleToggleAllPlayers}
                >
                  {squadPlayers.length > 0 &&
                  enabledSquadPlayers.length === squadPlayers.length
                    ? 'Deseleccionar todo'
                    : 'Seleccionar todo'}
                </button>
                <span className="meta-pill">
                  Jugadores: {squadPlayers.length}
                </span>
                <span className="meta-pill">
                  Activos: {enabledSquadPlayers.length}/{squadPlayers.length}
                </span>
              </div>
            </div>

            <div className="team-roster__table-wrap">
              <table className="team-roster__table">
                <thead>
                  <tr>
                    <th>Usar</th>
                    <th>Jugador</th>
                    <th className="team-roster__cell--centered">Apodo</th>
                    <th className="team-roster__cell--centered">Genero</th>
                    <th className="team-roster__cell--centered">
                      <button
                        type="button"
                        className="team-roster__sort-button"
                        onClick={() => handleSquadSortToggle('average')}
                      >
                        <span>Media</span>
                        <span className="team-roster__sort-indicator" aria-hidden="true">
                          {squadSort?.key === 'average'
                            ? squadSort.direction === 'desc'
                              ? '↓'
                              : '↑'
                            : '·'}
                        </span>
                      </button>
                    </th>
                    <th className="team-roster__cell--centered">
                      <button
                        type="button"
                        className="team-roster__sort-button"
                        onClick={() => handleSquadSortToggle('position')}
                      >
                        <span>Posicion</span>
                        <span className="team-roster__sort-indicator" aria-hidden="true">
                          {squadSort?.key === 'position'
                            ? squadSort.direction === 'asc'
                              ? '↓'
                              : '↑'
                            : '·'}
                        </span>
                      </button>
                    </th>
                    <th className="team-roster__cell--centered">Elemento</th>
                    <th>Rango</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedSquadPlayers.map((player, index) => {
                    const captainLabel = getCaptainLabel(player.captain);
                    const playerKey = getPlayerKey(player);
                    const isChecked = selectedPlayers[playerKey] !== false;

                    return (
                      <tr key={`${player.player}-${index}`}>
                        <td>
                          <label className="player-check">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handlePlayerToggle(player)}
                            />
                            <span className="player-check__visual" aria-hidden="true" />
                            <span className="sr-only">
                              Incluir a {player.player} en la generacion
                            </span>
                          </label>
                        </td>
                        <td>
                          <div className="team-roster__player-cell">
                            {player.img ? (
                              <div className="team-roster__player-image-wrap" aria-hidden="true">
                                <img
                                  className="team-roster__player-image"
                                  src={player.img}
                                  alt=""
                                />
                              </div>
                            ) : (
                              <div
                                className="team-roster__player-image-wrap team-roster__player-image-wrap--fallback"
                                aria-hidden="true"
                              >
                                <span>
                                  {player.player
                                    .split(' ')
                                    .slice(0, 2)
                                    .map((part) => part[0] || '')
                                    .join('')
                                    .toUpperCase()}
                                </span>
                              </div>
                            )}
                            <span>{player.player}</span>
                          </div>
                        </td>
                        <td className="team-roster__cell--centered">{player.nickname || '-'}</td>
                        <td className="team-roster__cell--centered">
                          {renderGenderIcon(player.gender)}
                        </td>
                            <td className="team-roster__cell--centered">{player.average ?? '-'}</td>
                        <td className="team-roster__cell--centered">{player.position || '-'}</td>
                        <td className="team-roster__cell--centered">
                          {renderElementIcon(player.element)}
                        </td>
                        <td>{captainLabel || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>
        ) : null}

        {activeSection === 'analysis' ? (
          <section className="analysis-grid">
            <article className="panel analysis-card analysis-card--full">
              <h2 className="team-roster__title">Vision general</h2>
              <div className="analysis-overview">
                <div className="analysis-overview__item">
                  <strong>{enabledSquadPlayers.length}</strong>
                  <span>Jugadores activos</span>
                </div>
                <div className="analysis-overview__item">
                  <strong>{analysisData.overallAverageMedia.toFixed(1)}</strong>
                  <span>Media general</span>
                </div>
                <div className="analysis-overview__item">
                  <strong>{analysisData.bestAffinityAnalysis?.label || 'Neutro'}</strong>
                  <span>Afinidad ideal</span>
                </div>
                <div className="analysis-overview__item">
                  <strong>{Math.max(enabledSquadPlayers.length - 11, 0)}</strong>
                  <span>Jugadores de rotacion</span>
                </div>
              </div>
            </article>

            <article className="panel analysis-card">
              <h2 className="team-roster__title">Resumen por posicion</h2>
              <div className="analysis-card__stats">
                {POSITION_ORDER.map((position) => (
                  <div className="analysis-stat" key={position}>
                    <strong>{analysisData.positionCounts[position]}</strong>
                    <span>{POSITION_LABELS[position]}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel analysis-card">
              <h2 className="team-roster__title">Resumen elemental</h2>
              <div className="analysis-card__stats">
                {ELEMENT_ORDER.map((element) => (
                  <div className="analysis-stat" key={element}>
                    <strong>{analysisData.elementCounts[element]}</strong>
                    <span>{renderElementBadge(element)}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel analysis-card">
              <h2 className="team-roster__title">Mejor alineacion</h2>
              {analysisData.bestFormationAnalysis ? (
                <div className="analysis-highlight">
                  <strong>{analysisData.bestFormationAnalysis.formation.label}</strong>
                  <span>
                    Media total {analysisData.bestFormationAnalysis.totalMedia} con
                    afinidad {analysisData.bestAffinityAnalysis?.label || analysisAffinity}
                  </span>
                  <span>
                    Media promedio{' '}
                    {analysisData.bestFormationAnalysis.averageMedia.toFixed(1)}
                  </span>
                  <span>
                    Nombres clave:{' '}
                    {analysisData.bestFormationAnalysis.lineup
                      .slice(0, 3)
                      .map((player) => player.player)
                      .join(', ')}
                  </span>
                </div>
              ) : (
                <p className="analysis-empty">No hay suficientes jugadores activos.</p>
              )}
            </article>

            <article className="panel analysis-card">
              <h2 className="team-roster__title">Jugadores clave</h2>
              <div className="analysis-key-grid">
                {POSITION_ORDER.map((position) => {
                  const bestPlayer = analysisData.bestPlayersByPosition[position];

                  return (
                    <div className="analysis-key-card" key={position}>
                      <span className="analysis-key-card__label">
                        Mejor {POSITION_LABELS[position].slice(0, -1).toLowerCase()}
                      </span>
                      {bestPlayer ? (
                        <>
                          <strong>{bestPlayer.player}</strong>
                          <span>Media base {getPlayerBaseMedia(bestPlayer)}</span>
                          <span>{renderElementBadge(bestPlayer.element)}</span>
                        </>
                      ) : (
                        <span className="analysis-empty">Sin jugadores activos</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="panel analysis-card">
              <h2 className="team-roster__title">Posicion a reforzar</h2>
              {analysisData.reinforcementTarget ? (
                <div className="analysis-highlight">
                  <strong>
                    {POSITION_LABELS[analysisData.reinforcementTarget.position]}
                  </strong>
                  <span>{analysisData.reinforcementTarget.message}</span>
                </div>
              ) : (
                <p className="analysis-empty">No hay datos suficientes.</p>
              )}
            </article>

            <article className="panel analysis-card">
              <h2 className="team-roster__title">Referencias del equipo</h2>
              <div className="analysis-list-compact">
                {analysisData.topPlayersOverall.map((player) => (
                  <div className="analysis-player-row" key={getPlayerKey(player)}>
                    <strong>{player.player}</strong>
                    <span>Media {getPlayerBaseMedia(player)}</span>
                    <span>{renderElementBadge(player.element)}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel analysis-card analysis-card--full">
              <h2 className="team-roster__title">Consideraciones tacticas</h2>
              <ul className="analysis-list">
                {analysisData.considerations.map((consideration) => (
                  <li key={consideration}>{consideration}</li>
                ))}
              </ul>
            </article>

            <article className="panel analysis-card analysis-card--full">
              <h2 className="team-roster__title">Recomendaciones automaticas</h2>
              <ul className="analysis-list">
                {analysisData.recommendations.map((recommendation) => (
                  <li key={recommendation}>{recommendation}</li>
                ))}
              </ul>
            </article>
          </section>
        ) : null}
      </div>

      {manualSwapTarget ? (
        <div className="player-swap-modal" role="dialog" aria-modal="true">
          <div className="player-swap-modal__backdrop" aria-hidden="true" />
          <div className="panel player-swap-modal__panel">
            <div className="player-swap-modal__header">
              <div>
                <h2 className="team-roster__title">Cambiar jugador</h2>
                <p className="lineup-builder__description">
                  {manualSwapTarget.player} ocupa ahora la posicion{' '}
                  {manualSwapTarget.idealPosition}. Elige otro jugador activo de esa
                  misma posicion.
                </p>
              </div>

              <button
                type="button"
                className="player-swap-modal__close"
                onClick={handleCloseManualSwap}
                aria-label="Cerrar selector de cambio"
              >
                X
              </button>
            </div>

            <div className="player-swap-modal__current">
              <span className="player-swap-modal__section-label">Jugador actual</span>
              <div className="player-swap-card player-swap-card--current">
                <div className="player-swap-card__identity">
                  {manualSwapTarget.img ? (
                    <img
                      className="player-swap-card__image"
                      src={manualSwapTarget.img}
                      alt=""
                    />
                  ) : (
                    <div className="player-swap-card__placeholder" aria-hidden="true">
                      {manualSwapTarget.player.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div className="player-swap-card__text">
                    <strong>{manualSwapTarget.player}</strong>
                    <span>{manualSwapTarget.nickname || 'Sin apodo'}</span>
                  </div>
                </div>

                <div className="player-swap-card__meta">
                  <span className="meta-pill">Media: {manualSwapTarget.adjustedMedia}</span>
                  <span className="meta-pill">
                    Afinidad: {getAffinityScoreLabel(manualSwapTarget.affinityScore)}
                  </span>
                  <span className="meta-pill">{renderElementIcon(manualSwapTarget.element)}</span>
                </div>
              </div>
            </div>

            {swapCandidates.length > 0 ? (
              <div className="player-swap-modal__list-wrap">
                <span className="player-swap-modal__section-label">Cambios posibles</span>
                <div className="player-swap-modal__list">
                {swapCandidates.map((player) => (
                  <button
                    key={`${getPlayerKey(player)}-${player.idealPosition}`}
                    type="button"
                    className={
                      getPlayerKey(player) === bestUpgradeKey
                        ? 'player-swap-card player-swap-card--better'
                        : 'player-swap-card'
                    }
                    onClick={() => handleManualSwap(player)}
                  >
                    <div className="player-swap-card__identity">
                      {player.img ? (
                        <img
                          className="player-swap-card__image"
                          src={player.img}
                          alt=""
                        />
                      ) : (
                        <div className="player-swap-card__placeholder" aria-hidden="true">
                          {player.player.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div className="player-swap-card__text">
                        <strong>{player.player}</strong>
                        <span>{player.nickname || 'Sin apodo'}</span>
                      </div>
                    </div>

                    <div className="player-swap-card__meta">
                      {getPlayerKey(player) === bestUpgradeKey ? (
                        <span className="player-swap-card__badge">Mejor eleccion</span>
                      ) : null}
                      <span className="meta-pill">Media: {player.adjustedMedia}</span>
                      <span className="meta-pill">
                        Afinidad: {getAffinityScoreLabel(player.affinityScore)}
                      </span>
                      <span className="meta-pill">{renderElementIcon(player.element)}</span>
                    </div>
                  </button>
                ))}
                </div>
              </div>
            ) : (
              <div className="player-swap-modal__empty">
                No hay otros jugadores activos de esta posicion fuera del once actual.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default TeamPage;
